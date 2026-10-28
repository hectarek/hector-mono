import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetPersonUseCase } from "@/src/application/use-cases/people/get-person.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type PersonDetail,
  personIdSchema,
} from "@/src/entities/models/person.model";

export type IGetPersonController = ReturnType<typeof getPersonController>;

// The one read behind a person's page and get_person (docs/build-plan.md KTD4).
export const getPersonController = (
  useCase: IGetPersonUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getPerson",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<PersonDetail> => {
    const { data, error: parseError } = personIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_person input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
