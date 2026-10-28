import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteInteractionUseCase } from "@/src/application/use-cases/interactions/delete-interaction.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Interaction,
  interactionIdSchema,
} from "@/src/entities/models/interaction.model";

export type IDeleteInteractionController = ReturnType<
  typeof deleteInteractionController
>;

// Deleting an interaction, from its person's page: human-only (R21), so no page tool calls it.
export const deleteInteractionController = (
  useCase: IDeleteInteractionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteInteraction",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<Interaction> => {
    const { data, error: parseError } = interactionIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete interaction input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
