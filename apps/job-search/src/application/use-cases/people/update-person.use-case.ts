import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { requireCompany } from "@/src/application/use-cases/jobs/job-checks";
import { datedPerson } from "@/src/application/use-cases/people/person-dates";
import { ConflictError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Person,
  type PersonFacts,
  type PersonRecord,
  personLogged,
  type UpdatePersonInput,
} from "@/src/entities/models/person.model";

export type IUpdatePersonUseCase = ReturnType<typeof updatePersonUseCase>;

// Changes the facts given about a person (update_person, docs/build-plan.md U7), made only against
// the updatedAt read with them (R22). A change that sets what's already there writes and logs
// nothing. The person's dates come from their interactions, so no change sets them (KTD9).
export const updatePersonUseCase = (
  peopleRepository: IPeopleRepository,
  companiesRepository: ICompaniesRepository,
  interactionsRepository: IInteractionsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updatePerson",
  });

  return async (
    context: ChangeContext,
    { id, updatedAt, ...changes }: UpdatePersonInput,
  ): Promise<Person> => {
    const { ownerId } = context;
    const person = await transactionManager.startTransaction(async (tx) => {
      const current = await peopleRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that person.");
      }
      if (current.updatedAt.getTime() !== updatedAt.getTime()) {
        throw new ConflictError(
          await datedPerson(interactionsRepository, ownerId, current, tx),
        );
      }
      const changed = differences(current, changes);
      if (Object.keys(changed).length === 0) {
        return current;
      }
      if (changed.companyId) {
        await requireCompany(
          companiesRepository,
          ownerId,
          changed.companyId,
          tx,
        );
      }
      const updated = await peopleRepository.update(ownerId, id, changed, tx);
      await recordChange(activityRepository, tx, context, {
        record: { kind: "person", id },
        action: "updated",
        before: personLogged(current),
        after: personLogged(updated),
      });
      return updated;
    });
    logger.info("Person updated", { personId: id });
    return datedPerson(interactionsRepository, ownerId, person);
  };
};

// The facts given whose values differ from the person's: what the change sets.
function differences(
  person: PersonRecord,
  changes: Partial<PersonFacts>,
): Partial<PersonFacts> {
  const now: PersonFacts = {
    name: person.name,
    companyId: person.company?.id ?? null,
    role: person.role,
    howKnown: person.howKnown,
    rank: person.rank,
    ask: person.ask,
    nextStep: person.nextStep,
    nextDate: person.nextDate,
    notes: person.notes,
  };
  return Object.fromEntries(
    Object.entries(changes).filter(
      ([fact, value]) =>
        value !== undefined && value !== now[fact as keyof PersonFacts],
    ),
  );
}
