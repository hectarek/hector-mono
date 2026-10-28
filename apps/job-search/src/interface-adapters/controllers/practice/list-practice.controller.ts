import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListPracticeUseCase } from "@/src/application/use-cases/practice/list-practice.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  listPracticeSchema,
  type PracticePage,
} from "@/src/entities/models/practice-entry.model";

export type IListPracticeController = ReturnType<typeof listPracticeController>;

// The read behind the practice page and list_practice (docs/build-plan.md KTD4, U8).
export const listPracticeController = (
  useCase: IListPracticeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listPractice",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<PracticePage> => {
    const { data, error: parseError } = listPracticeSchema.safeParse(input);
    if (parseError) {
      logger.warn("list_practice input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
