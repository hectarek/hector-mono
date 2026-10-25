import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type {
  SessionStart,
  StartSessionInput,
} from "@/src/entities/models/agent-session.model";

export type IStartSessionUseCase = ReturnType<typeof startSessionUseCase>;

// Starts a working session (F1, docs/build-plan.md U4): logs the start as a record of its own,
// with no new table (KTD7's log holds it), then answers with the changes since the actor's previous
// session started. The start is written first, so a change made meanwhile falls in this window or
// the next one, never between them.
export const startSessionUseCase = (
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "startSession",
  });

  return async (
    context: ChangeContext,
    { limit }: StartSessionInput,
  ): Promise<SessionStart> => {
    const id = crypto.randomUUID();
    // One transaction for the start and both reads, so a failure anywhere rolls the start back.
    // A start that stayed would be the retry's previous one, and the retry would skip every
    // change since the actor's last session that started.
    const sessionStart = await transactionManager.startTransaction(
      async (tx) => {
        await recordChange(activityRepository, tx, context, {
          record: { kind: "agent-session", id },
          action: "created",
        });

        // This session's start and the one before it, newest first.
        const {
          entries: [started, previous],
        } = await activityRepository.list(
          context.ownerId,
          {
            record: { kind: "agent-session" },
            actor: context.actor,
            limit: 2,
            offset: 0,
          },
          tx,
        );
        if (started?.record.id !== id) {
          throw new DatabaseOperationError(
            "Couldn't read back the session's start",
          );
        }

        const since = previous?.createdAt;
        const { entries, nextOffset } = await activityRepository.list(
          context.ownerId,
          { since, until: started.createdAt, limit, offset: 0 },
          tx,
        );
        return {
          session: { id, startedAt: started.createdAt },
          since: since ?? null,
          changes: entries,
          nextOffset,
        };
      },
    );
    logger.info("Session started", {
      sessionId: id,
      changes: sessionStart.changes.length,
    });
    return sessionStart;
  };
};
