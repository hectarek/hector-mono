import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type AddedSource,
  addSourceSchema,
} from "@/src/entities/models/lead-source.model";

export type IAddSourceController = ReturnType<typeof addSourceController>;

// add_source's write, and the settings page's (docs/build-plan.md KTD4).
export const addSourceController = (
  useCase: IAddSourceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "addSource" });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<AddedSource> => {
    const { data, error: parseError } = addSourceSchema.safeParse(input);
    if (parseError) {
      logger.warn("add_source input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid source", { cause: parseError });
    }
    return useCase(context, data);
  };
};
