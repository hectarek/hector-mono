import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addPersonUseCase } from "@/src/application/use-cases/people/add-person.use-case";
import { deletePersonUseCase } from "@/src/application/use-cases/people/delete-person.use-case";
import { findPeopleUseCase } from "@/src/application/use-cases/people/find-people.use-case";
import { getPersonUseCase } from "@/src/application/use-cases/people/get-person.use-case";
import { removeContactUseCase } from "@/src/application/use-cases/people/remove-contact.use-case";
import { updatePersonUseCase } from "@/src/application/use-cases/people/update-person.use-case";
import { PeopleRepository } from "@/src/infrastructure/repositories/people.repository";
import { MockPeopleRepository } from "@/src/infrastructure/repositories/people.repository.mock";
import { addPersonController } from "@/src/interface-adapters/controllers/people/add-person.controller";
import { deletePersonController } from "@/src/interface-adapters/controllers/people/delete-person.controller";
import { findPeopleController } from "@/src/interface-adapters/controllers/people/find-people.controller";
import { getPersonController } from "@/src/interface-adapters/controllers/people/get-person.controller";
import { removeContactController } from "@/src/interface-adapters/controllers/people/remove-contact.controller";
import { updatePersonController } from "@/src/interface-adapters/controllers/people/update-person.controller";

// People and their links to jobs (docs/build-plan.md U7).
export function createPeopleModule() {
  const peopleModule = createModule();

  if (process.env.NODE_ENV === "test") {
    peopleModule
      .bind(DI_SYMBOLS.IPeopleRepository)
      .toClass(MockPeopleRepository, [DI_SYMBOLS.ICompaniesRepository]);
  } else {
    peopleModule
      .bind(DI_SYMBOLS.IPeopleRepository)
      .toClass(PeopleRepository, [DI_SYMBOLS.ILoggerService]);
  }

  peopleModule
    .bind(DI_SYMBOLS.IFindPeopleUseCase)
    .toHigherOrderFunction(findPeopleUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  peopleModule
    .bind(DI_SYMBOLS.IGetPersonUseCase)
    .toHigherOrderFunction(getPersonUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  peopleModule
    .bind(DI_SYMBOLS.IAddPersonUseCase)
    .toHigherOrderFunction(addPersonUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  peopleModule
    .bind(DI_SYMBOLS.IUpdatePersonUseCase)
    .toHigherOrderFunction(updatePersonUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  peopleModule
    .bind(DI_SYMBOLS.IDeletePersonUseCase)
    .toHigherOrderFunction(deletePersonUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  peopleModule
    .bind(DI_SYMBOLS.IRemoveContactUseCase)
    .toHigherOrderFunction(removeContactUseCase, [
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  const controllers = [
    [
      DI_SYMBOLS.IFindPeopleController,
      findPeopleController,
      DI_SYMBOLS.IFindPeopleUseCase,
    ],
    [
      DI_SYMBOLS.IGetPersonController,
      getPersonController,
      DI_SYMBOLS.IGetPersonUseCase,
    ],
    [
      DI_SYMBOLS.IAddPersonController,
      addPersonController,
      DI_SYMBOLS.IAddPersonUseCase,
    ],
    [
      DI_SYMBOLS.IUpdatePersonController,
      updatePersonController,
      DI_SYMBOLS.IUpdatePersonUseCase,
    ],
    [
      DI_SYMBOLS.IDeletePersonController,
      deletePersonController,
      DI_SYMBOLS.IDeletePersonUseCase,
    ],
    [
      DI_SYMBOLS.IRemoveContactController,
      removeContactController,
      DI_SYMBOLS.IRemoveContactUseCase,
    ],
  ] as const;
  for (const [symbol, controller, useCase] of controllers) {
    peopleModule
      .bind(symbol)
      .toHigherOrderFunction(controller, [useCase, DI_SYMBOLS.ILoggerService]);
  }

  return peopleModule;
}
