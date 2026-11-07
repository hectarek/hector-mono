import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type {
  IBlocksRepository,
  NewBlock,
} from "@/src/application/repositories/blocks.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  ConflictError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  BLOCK_TIMES_MESSAGE,
  type Block,
  type BlockFacts,
  blockDay,
  blockLogged,
  endsAfterStart,
  type UpdateBlockInput,
} from "@/src/entities/models/block.model";

export type IUpdateBlockUseCase = ReturnType<typeof updateBlockUseCase>;

// Changes the facts given about a block (update_block, docs/build-plan.md U17): how it went and
// what happened, or its plan. Made only against the updatedAt read with it (R22). A change that
// sets what's already there writes and logs nothing. A new start moves the block to its day.
export const updateBlockUseCase = (
  blocksRepository: IBlocksRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "updateBlock" });

  return async (
    context: ChangeContext,
    { id, updatedAt, ...changes }: UpdateBlockInput,
  ): Promise<Block> => {
    const { ownerId } = context;
    const block = await transactionManager.startTransaction(async (tx) => {
      const current = await blocksRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that block.");
      }
      if (current.updatedAt.getTime() !== updatedAt.getTime()) {
        throw new ConflictError(current);
      }
      const changed = differences(current, changes);
      if (Object.keys(changed).length === 0) {
        return current;
      }
      if (!endsAfterStart({ ...current, ...changed })) {
        // Under the field the form shows it on, as the schema's own check is.
        throw new InputParseError(BLOCK_TIMES_MESSAGE, {
          cause: {
            issues: [{ path: ["endsAt"], message: BLOCK_TIMES_MESSAGE }],
          },
        });
      }
      const write: Partial<NewBlock> = changed.startsAt
        ? { ...changed, day: blockDay(changed.startsAt) }
        : changed;
      const updated = await blocksRepository.update(ownerId, id, write, tx);
      await recordChange(activityRepository, tx, context, {
        record: { kind: "block", id },
        action: "updated",
        before: blockLogged(current),
        after: blockLogged(updated),
      });
      return updated;
    });
    logger.info("Block updated", { blockId: id });
    return block;
  };
};

// The facts given whose values differ from the block's: what the change sets. Times compare as
// instants.
function differences(
  block: Block,
  changes: Partial<BlockFacts>,
): Partial<BlockFacts> {
  const same = (fact: keyof BlockFacts, value: unknown) => {
    const now = block[fact];
    return now instanceof Date && value instanceof Date
      ? now.getTime() === value.getTime()
      : now === value;
  };
  return Object.fromEntries(
    Object.entries(changes).filter(
      ([fact, value]) =>
        value !== undefined && !same(fact as keyof BlockFacts, value),
    ),
  );
}
