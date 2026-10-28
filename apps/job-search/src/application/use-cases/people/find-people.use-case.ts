import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { withDates } from "@/src/application/use-cases/people/person-dates";
import {
  type PeoplePage,
  type PeopleQuery,
  personSummary,
} from "@/src/entities/models/person.model";

export type IFindPeopleUseCase = ReturnType<typeof findPeopleUseCase>;

// The owner's people by name, a page at a time (find_people, docs/build-plan.md U7), each with the
// dates their interactions give them.
export const findPeopleUseCase = (
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "findPeople" });

  return async (ownerId: string, query: PeopleQuery): Promise<PeoplePage> => {
    const { people, nextOffset } = await peopleRepository.find(ownerId, query);
    const dated = await withDates(interactionsRepository, ownerId, people);
    logger.debug("People found", { count: dated.length });
    return { people: dated.map(personSummary), nextOffset };
  };
};
