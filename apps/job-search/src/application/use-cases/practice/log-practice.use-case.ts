import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { scheduled } from "@/src/application/use-cases/practice/scheduled";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type LoggedPractice,
  type LogPracticeRequest,
  type PracticeSessionRecord,
  reviewLogged,
  sessionLogged,
} from "@/src/entities/models/practice-entry.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { nextReview } from "@/src/entities/practice-ladder";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ILogPracticeUseCase = ReturnType<typeof logPracticeUseCase>;

type SessionRequest = Extract<LogPracticeRequest, { kind: "session" }>;
type ReviewRequest = Extract<LogPracticeRequest, { kind: "review" }>;

// Logs practice (log_practice, docs/build-plan.md U8, R11): a new session, or the next review of
// one, dated today unless given a day, and never after it. A review needs one waiting: a session
// whose third review was solved has none, and a review can't come before the try it follows. Each
// write and its history share one transaction (KTD7), and a review reads its session locked, so
// two at once settle one at a time.
export const logPracticeUseCase = (
  practiceRepository: IPracticeRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "logPractice" });

  return async (
    context: ChangeContext,
    request: LogPracticeRequest,
  ): Promise<LoggedPractice> => {
    const today = todayIn(PLAN_TIME_ZONE);
    const practicedOn = request.practicedOn ?? today;
    if (practicedOn > today) {
      throw new InputParseError("Practice can't be dated after today.");
    }
    const session = await transactionManager.startTransaction((tx) =>
      request.kind === "session"
        ? logSession(context, request, practicedOn, tx)
        : logReview(context, request, practicedOn, tx),
    );
    logger.info("Practice logged", {
      sessionId: session.id,
      kind: request.kind,
    });
    return { session: scheduled(session) };
  };

  async function logSession(
    context: ChangeContext,
    request: SessionRequest,
    practicedOn: string,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord> {
    const session = await practiceRepository.addSession(
      context.ownerId,
      {
        topic: request.topic,
        type: request.type,
        pattern: request.pattern,
        practicedOn,
        result: request.result,
        aiUsed: request.aiUsed,
        minutes: request.minutes,
        notes: request.notes,
        author: context.actor,
      },
      tx,
    );
    await recordChange(activityRepository, tx, context, {
      record: { kind: "practice-entry", id: session.id },
      action: "created",
      after: sessionLogged(session),
    });
    return session;
  }

  async function logReview(
    context: ChangeContext,
    request: ReviewRequest,
    practicedOn: string,
    tx: ITransaction,
  ): Promise<PracticeSessionRecord> {
    const session = await practiceRepository.getSessionForUpdate(
      context.ownerId,
      request.sessionId,
      tx,
    );
    if (!session) {
      throw new NotFoundError("Couldn't find that practice session.");
    }
    const next = nextReview(session);
    if (!next) {
      throw new InputParseError("That session's reviews are done.");
    }
    const last = session.reviews.at(-1) ?? session;
    if (practicedOn < last.practicedOn) {
      throw new InputParseError(
        "A review can't be dated before the try it follows.",
      );
    }
    const review = await practiceRepository.addReview(
      context.ownerId,
      {
        sessionId: session.id,
        practicedOn,
        result: request.result,
        aiUsed: request.aiUsed,
        minutes: request.minutes,
        notes: request.notes,
        author: context.actor,
      },
      tx,
    );
    await recordChange(activityRepository, tx, context, {
      record: { kind: "practice-entry", id: review.id },
      action: "created",
      after: {
        session: session.topic,
        step: next.step,
        ...reviewLogged(review),
      },
    });
    return { ...session, reviews: [...session.reviews, review] };
  }
};
