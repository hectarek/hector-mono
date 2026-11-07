import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateBlockUseCase } from "@/src/application/use-cases/blocks/update-block.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Block,
  updateBlockSchema,
} from "@/src/entities/models/block.model";

export type IUpdateBlockController = ReturnType<typeof updateBlockController>;

// update_block's write, and the block sheet's and form's (docs/build-plan.md KTD4, U17).
export const updateBlockController = (
  useCase: IUpdateBlockUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateBlock",
  });

  return async (input: unknown, context: ChangeContext): Promise<Block> => {
    const { data, error: parseError } = updateBlockSchema.safeParse(input);
    if (parseError) {
      logger.warn("update_block input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid block", { cause: parseError });
    }
    return useCase(context, data);
  };
};
