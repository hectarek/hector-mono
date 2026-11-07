import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IBlocksRepository } from "@/src/application/repositories/blocks.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type AddBlocksInput,
  type Block,
  blockDay,
  blockLogged,
} from "@/src/entities/models/block.model";

export type IAddBlocksUseCase = ReturnType<typeof addBlocksUseCase>;

// Adds Focus blocks (add_blocks, docs/build-plan.md U17): one from Hector's form, or a week's as
// Claude drafts it. They go in together or not at all, each on its start's day in Eastern time
// (KTD18) and each logged as created (R19).
export const addBlocksUseCase = (
  blocksRepository: IBlocksRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addBlocks" });

  return async (
    context: ChangeContext,
    { blocks }: AddBlocksInput,
  ): Promise<Block[]> => {
    const added = await transactionManager.startTransaction(async (tx) => {
      const written: Block[] = [];
      for (const facts of blocks) {
        const block = await blocksRepository.add(
          context.ownerId,
          { ...facts, day: blockDay(facts.startsAt) },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "block", id: block.id },
          action: "created",
          after: blockLogged(block),
        });
        written.push(block);
      }
      return written;
    });
    logger.info("Blocks added", { count: added.length });
    return added;
  };
};
