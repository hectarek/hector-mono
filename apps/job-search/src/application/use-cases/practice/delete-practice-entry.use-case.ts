import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  type DeletedPracticeEntry,
  reviewLogged,
  sessionLogged,
} from "@/src/entities/models/practice-entry.model";

export type IDeletePracticeEntryUseCase = ReturnType<
  typeof deletePracticeEntryUseCase
>;

// Deletes a session, with its reviews, or one review, which only Hector may do (R21): Claude's try
// is refused, and logged, before anything is read. A deleted review takes its step on the ladder
// with it (R11). The history keeps the entry as it was.
export const deletePracticeEntryUseCase = (
  practiceRepository: IPracticeRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deletePracticeEntry",
  });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<DeletedPracticeEntry> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "practice-entry", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(
      async (tx): Promise<DeletedPracticeEntry> => {
        const session = await practiceRepository.getSessionForUpdate(
          ownerId,
          id,
          tx,
        );
        if (session) {
          await practiceRepository.delete(ownerId, id, tx);
          await recordChange(activityRepository, tx, context, {
            record,
            action: "deleted",
            before: {
              ...sessionLogged(session),
              reviews: session.reviews.length,
            },
          });
          return { id, kind: "session", sessionId: id };
        }
        const review = await practiceRepository.getReviewForUpdate(
          ownerId,
          id,
          tx,
        );
        if (!review) {
          throw new NotFoundError("Couldn't find that practice entry.");
        }
        await practiceRepository.delete(ownerId, id, tx);
        await recordChange(activityRepository, tx, context, {
          record,
          action: "deleted",
          before: reviewLogged(review),
        });
        return { id, kind: "review", sessionId: review.sessionId };
      },
    );
    logger.info("Practice entry deleted", {
      entryId: id,
      kind: deleted.kind,
    });
    return deleted;
  };
};
