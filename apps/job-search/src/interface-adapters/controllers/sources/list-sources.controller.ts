import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type LeadSource,
  listSourcesSchema,
} from "@/src/entities/models/lead-source.model";

export type IListSourcesController = ReturnType<typeof listSourcesController>;

// The sources a job picks from: the settings page's list, the job forms' and list_sources'. It
// takes no input.
export const listSourcesController = (
  useCase: IListSourcesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listSources",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<LeadSource[]> => {
    const { error: parseError } = listSourcesSchema.safeParse(input);
    if (parseError) {
      logger.warn("list_sources input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId);
  };
};
