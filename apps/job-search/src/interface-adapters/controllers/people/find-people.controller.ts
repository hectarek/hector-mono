import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IFindPeopleUseCase } from "@/src/application/use-cases/people/find-people.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  findPeopleSchema,
  type PeoplePage,
} from "@/src/entities/models/person.model";

export type IFindPeopleController = ReturnType<typeof findPeopleController>;

// The read behind the people list and find_people (docs/build-plan.md KTD4).
export const findPeopleController = (
  useCase: IFindPeopleUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "findPeople",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<PeoplePage> => {
    const { data, error: parseError } = findPeopleSchema.safeParse(input);
    if (parseError) {
      logger.warn("find_people input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
