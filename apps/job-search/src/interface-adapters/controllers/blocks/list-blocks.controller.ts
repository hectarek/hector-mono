import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListBlocksUseCase } from "@/src/application/use-cases/blocks/list-blocks.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type BlocksWeek,
  listBlocksSchema,
} from "@/src/entities/models/block.model";

export type IListBlocksController = ReturnType<typeof listBlocksController>;

// list_blocks' read, and the week page's (docs/build-plan.md U17).
export const listBlocksController = (
  useCase: IListBlocksUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listBlocks",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<BlocksWeek> => {
    const { data, error: parseError } = listBlocksSchema.safeParse(input);
    if (parseError) {
      logger.warn("list_blocks input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
