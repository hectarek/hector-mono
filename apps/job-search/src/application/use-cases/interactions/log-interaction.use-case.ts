import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { afterFollowUp } from "@/src/entities/job-lifecycle";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Interaction,
  interactionLogged,
  type LoggedInteractions,
  type LogInteractionRequest,
  type NextStep,
} from "@/src/entities/models/interaction.model";
import type { Job } from "@/src/entities/models/job.model";
import type { PersonRecord } from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ILogInteractionUseCase = ReturnType<typeof logInteractionUseCase>;

type Log = Extract<LogInteractionRequest, { type: "log" }>;
type Outcome = Extract<LogInteractionRequest, { type: "outcome" }>;

// Logs interactions with people (log_interaction, docs/build-plan.md U7, KTD9; R8): one per person
// named, on a day, today by default and never after it, except a scheduled conversation, whose
// day is its start's. A job named links each person to it as a contact (R1), and a sent message
// linked to an applied job moves its follow-up (R3). Or it records how a scheduled conversation
// ended. Either way, a next step and date go on the people. Every write and its history share one
// transaction (KTD7).
export const logInteractionUseCase = (
  interactionsRepository: IInteractionsRepository,
  peopleRepository: IPeopleRepository,
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "logInteraction",
  });

  return async (
    context: ChangeContext,
    request: LogInteractionRequest,
  ): Promise<LoggedInteractions> => {
    const logged = await transactionManager.startTransaction((tx) =>
      request.type === "log"
        ? log(context, request, tx)
        : end(context, request, tx),
    );
    logger.info("Interactions logged", {
      count: logged.interactions.length,
    });
    return logged;
  };

  async function log(
    context: ChangeContext,
    request: Log,
    tx: ITransaction,
  ): Promise<LoggedInteractions> {
    const { ownerId } = context;
    const today = todayIn(PLAN_TIME_ZONE);
    const { scheduled } = request;
    const occurredOn = scheduled
      ? todayIn(PLAN_TIME_ZONE, scheduled.startsAt)
      : (request.occurredOn ?? today);
    if (!scheduled && occurredOn > today) {
      throw new InputParseError("An interaction can't be dated after today.");
    }
    const job = request.jobId
      ? await jobsRepository.getForUpdate(ownerId, request.jobId, tx)
      : undefined;
    if (request.jobId && !job) {
      throw new NotFoundError("Couldn't find that job.");
    }

    const interactions: Interaction[] = [];
    for (const personId of new Set(request.personIds)) {
      const person = await peopleRepository.getForUpdate(ownerId, personId, tx);
      if (!person) {
        throw new NotFoundError("Couldn't find one of those people.");
      }
      const interaction = await interactionsRepository.add(
        ownerId,
        {
          personId,
          kind: request.kind,
          occurredOn,
          jobId: job?.id ?? null,
          note: request.note,
          state:
            request.kind === "conversation"
              ? scheduled
                ? "scheduled"
                : "held"
              : null,
          startsAt: scheduled?.startsAt ?? null,
          endsAt: scheduled?.endsAt ?? null,
          author: context.actor,
        },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "interaction", id: interaction.id },
        action: "created",
        after: { person: person.name, ...interactionLogged(interaction) },
      });
      if (job) {
        await peopleRepository.linkJob(ownerId, personId, job.id, tx);
      }
      await setNext(context, person, request.next, tx);
      interactions.push(interaction);
    }

    if (job && request.kind === "message-sent") {
      await followUp(context, job, tx);
    }
    return { interactions };
  }

  // How a scheduled conversation ended (R8). Recording the same outcome again changes nothing, so a
  // retried call never counts twice; another outcome for one that ended is refused.
  async function end(
    context: ChangeContext,
    { conversationId, outcome, note, next }: Outcome,
    tx: ITransaction,
  ): Promise<LoggedInteractions> {
    const { ownerId } = context;
    const current = await interactionsRepository.getForUpdate(
      ownerId,
      conversationId,
      tx,
    );
    if (current?.kind !== "conversation") {
      throw new NotFoundError("Couldn't find that conversation.");
    }
    if (current.state !== "scheduled") {
      if (current.state === outcome) {
        return { interactions: [current] };
      }
      throw new InputParseError(
        `That conversation was already recorded as ${current.state}.`,
      );
    }
    const ended = await interactionsRepository.setOutcome(
      ownerId,
      conversationId,
      { state: outcome, ...(note !== undefined && { note }) },
      tx,
    );
    await recordChange(activityRepository, tx, context, {
      record: { kind: "interaction", id: conversationId },
      action: "updated",
      before: { state: current.state, note: current.note },
      after: { state: ended.state, note: ended.note },
    });
    const person = await peopleRepository.getForUpdate(
      ownerId,
      current.personId,
      tx,
    );
    if (person) {
      await setNext(context, person, next, tx);
    }
    return { interactions: [ended] };
  }

  // A person's next step and date, as the log gives them: written and logged when they change.
  async function setNext(
    context: ChangeContext,
    person: PersonRecord,
    next: NextStep,
    tx: ITransaction,
  ): Promise<void> {
    const changed = Object.fromEntries(
      Object.entries(next).filter(
        ([field, value]) => value !== person[field as keyof NextStep],
      ),
    );
    if (Object.keys(changed).length === 0) {
      return;
    }
    await peopleRepository.update(context.ownerId, person.id, changed, tx);
    await recordChange(activityRepository, tx, context, {
      record: { kind: "person", id: person.id },
      action: "updated",
      before: { nextStep: person.nextStep, nextDate: person.nextDate },
      after: {
        nextStep: person.nextStep,
        nextDate: person.nextDate,
        ...changed,
      },
    });
  }

  // A follow-up message linked to an applied job moves its next date (R3), once however many people
  // the message went to.
  async function followUp(
    context: ChangeContext,
    job: Job,
    tx: ITransaction,
  ): Promise<void> {
    const { nextDate } = afterFollowUp(job);
    if (nextDate === job.nextDate) {
      return;
    }
    await jobsRepository.update(context.ownerId, job.id, { nextDate }, tx);
    await recordChange(activityRepository, tx, context, {
      record: { kind: "job", id: job.id },
      action: "updated",
      before: { nextDate: job.nextDate },
      after: { nextDate },
    });
  }
};
