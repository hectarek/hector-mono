import type { IBlocksRepository } from "@/src/application/repositories/blocks.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Block } from "@/src/entities/models/block.model";

export type IGetBlockUseCase = ReturnType<typeof getBlockUseCase>;

// One Focus block (get_block, docs/build-plan.md U17), as its page shows it.
export const getBlockUseCase =
  (blocksRepository: IBlocksRepository) =>
  async (ownerId: string, { id }: { id: string }): Promise<Block> => {
    const block = await blocksRepository.get(ownerId, id);
    if (!block) {
      throw new NotFoundError("Couldn't find that block.");
    }
    return block;
  };
