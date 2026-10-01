import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddPlanEntryUseCase } from "@/src/application/use-cases/plan/add-plan-entry.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  addPlanEntrySchema,
  type PlanEntry,
} from "@/src/entities/models/plan-entry.model";

const inputSchema = addPlanEntrySchema;

export type IAddPlanEntryController = ReturnType<typeof addPlanEntryController>;

export const addPlanEntryController = (
  useCase: IAddPlanEntryUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addPlanEntry",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<PlanEntry> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data, userId);
  };
};
