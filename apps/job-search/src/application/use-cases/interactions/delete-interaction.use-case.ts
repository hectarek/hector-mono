import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
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
  type Interaction,
  interactionLogged,
} from "@/src/entities/models/interaction.model";

export type IDeleteInteractionUseCase = ReturnType<
  typeof deleteInteractionUseCase
>;

// Deletes an interaction, which only Hector may do (R21): Claude's try is refused, and logged,
// before anything is read. The person's dates fall back to their other interactions (KTD9), and the
// history keeps the interaction as it was.
export const deleteInteractionUseCase = (
  interactionsRepository: IInteractionsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deleteInteraction",
  });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<Interaction> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "interaction", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const interaction = await interactionsRepository.getForUpdate(
        ownerId,
        id,
        tx,
      );
      if (!interaction) {
        throw new NotFoundError("Couldn't find that interaction.");
      }
      await interactionsRepository.delete(ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: interactionLogged(interaction),
      });
      return interaction;
    });
    logger.info("Interaction deleted", { interactionId: id });
    return deleted;
  };
};
