import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IBlocksRepository } from "@/src/application/repositories/blocks.repository.interface";
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
  blockLogged,
  type DeletedBlock,
} from "@/src/entities/models/block.model";

export type IDeleteBlockUseCase = ReturnType<typeof deleteBlockUseCase>;

// Deletes a Focus block, which only Hector may do (R21): Claude's try is refused, and logged,
// before anything is read. The history keeps what it held.
export const deleteBlockUseCase = (
  blocksRepository: IBlocksRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "deleteBlock" });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<DeletedBlock> => {
    const record: RecordRef = { kind: "block", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const block = await blocksRepository.getForUpdate(
        context.ownerId,
        id,
        tx,
      );
      if (!block) {
        throw new NotFoundError("Couldn't find that block.");
      }
      await blocksRepository.delete(context.ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: blockLogged(block),
      });
      return { id, day: block.day };
    });
    logger.info("Block deleted", { blockId: id });
    return deleted;
  };
};
