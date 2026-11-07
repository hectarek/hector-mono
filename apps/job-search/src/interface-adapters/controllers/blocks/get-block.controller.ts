import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetBlockUseCase } from "@/src/application/use-cases/blocks/get-block.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { type Block, blockIdSchema } from "@/src/entities/models/block.model";

export type IGetBlockController = ReturnType<typeof getBlockController>;

// get_block's read, and the read behind a block's page (docs/build-plan.md U17).
export const getBlockController = (
  useCase: IGetBlockUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getBlock" });

  return async (input: unknown, { ownerId }: CurrentActor): Promise<Block> => {
    const { data, error: parseError } = blockIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_block input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
