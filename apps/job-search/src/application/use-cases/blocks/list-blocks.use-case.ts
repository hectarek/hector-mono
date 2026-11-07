import type { IBlocksRepository } from "@/src/application/repositories/blocks.repository.interface";
import {
  type BlocksWeek,
  effortCounts,
} from "@/src/entities/models/block.model";
import {
  addDays,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

export type IListBlocksUseCase = ReturnType<typeof listBlocksUseCase>;

// A week's Focus blocks (list_blocks, docs/build-plan.md U17, R26): the week holding the day
// given, this week in Eastern time when none is, with each effort's blocks done, partly done and
// planned.
export const listBlocksUseCase =
  (blocksRepository: IBlocksRepository) =>
  async (ownerId: string, { week }: { week?: string }): Promise<BlocksWeek> => {
    const monday = mondayOf(week ?? todayIn(PLAN_TIME_ZONE));
    const blocks = await blocksRepository.listBetween(
      ownerId,
      monday,
      addDays(monday, 6),
    );
    return { monday, blocks, efforts: effortCounts(blocks) };
  };
