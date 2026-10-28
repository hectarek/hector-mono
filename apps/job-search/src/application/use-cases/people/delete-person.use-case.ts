import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  type DeletedPerson,
  personLogged,
} from "@/src/entities/models/person.model";

export type IDeletePersonUseCase = ReturnType<typeof deletePersonUseCase>;

// Deletes a person, with their interactions and their links to jobs, which only Hector may do
// (R21): Claude's try is refused, and logged, before anything is read. The history keeps the
// person's facts as they were.
export const deletePersonUseCase = (
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deletePerson",
  });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<DeletedPerson> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "person", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const person = await peopleRepository.getForUpdate(ownerId, id, tx);
      if (!person) {
        throw new NotFoundError("Couldn't find that person.");
      }
      const jobIds = await peopleRepository.jobIdsFor(ownerId, id, tx);
      await interactionsRepository.deleteForPerson(ownerId, id, tx);
      await peopleRepository.delete(ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: personLogged(person),
      });
      return {
        id,
        name: person.name,
        companyId: person.company?.id ?? null,
        jobIds,
      };
    });
    logger.info("Person deleted", { personId: id });
    return deleted;
  };
};
