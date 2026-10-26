import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { deleteCompanyUseCase } from "@/src/application/use-cases/companies/delete-company.use-case";
import { findCompaniesUseCase } from "@/src/application/use-cases/companies/find-companies.use-case";
import { getCompanyUseCase } from "@/src/application/use-cases/companies/get-company.use-case";
import { saveCompanyUseCase } from "@/src/application/use-cases/companies/save-company.use-case";
import { CompaniesRepository } from "@/src/infrastructure/repositories/companies.repository";
import { MockCompaniesRepository } from "@/src/infrastructure/repositories/companies.repository.mock";
import { deleteCompanyController } from "@/src/interface-adapters/controllers/companies/delete-company.controller";
import { findCompaniesController } from "@/src/interface-adapters/controllers/companies/find-companies.controller";
import { getCompanyController } from "@/src/interface-adapters/controllers/companies/get-company.controller";
import { saveCompanyController } from "@/src/interface-adapters/controllers/companies/save-company.controller";

// Companies (docs/build-plan.md U5).
export function createCompaniesModule() {
  const companiesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    companiesModule
      .bind(DI_SYMBOLS.ICompaniesRepository)
      .toClass(MockCompaniesRepository);
  } else {
    companiesModule
      .bind(DI_SYMBOLS.ICompaniesRepository)
      .toClass(CompaniesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  companiesModule
    .bind(DI_SYMBOLS.IFindCompaniesUseCase)
    .toHigherOrderFunction(findCompaniesUseCase, [
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  companiesModule
    .bind(DI_SYMBOLS.IFindCompaniesController)
    .toHigherOrderFunction(findCompaniesController, [
      DI_SYMBOLS.IFindCompaniesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  companiesModule
    .bind(DI_SYMBOLS.IGetCompanyUseCase)
    .toHigherOrderFunction(getCompanyUseCase, [
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  companiesModule
    .bind(DI_SYMBOLS.IGetCompanyController)
    .toHigherOrderFunction(getCompanyController, [
      DI_SYMBOLS.IGetCompanyUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  companiesModule
    .bind(DI_SYMBOLS.ISaveCompanyUseCase)
    .toHigherOrderFunction(saveCompanyUseCase, [
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  companiesModule
    .bind(DI_SYMBOLS.ISaveCompanyController)
    .toHigherOrderFunction(saveCompanyController, [
      DI_SYMBOLS.ISaveCompanyUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  companiesModule
    .bind(DI_SYMBOLS.IDeleteCompanyUseCase)
    .toHigherOrderFunction(deleteCompanyUseCase, [
      DI_SYMBOLS.ICompaniesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  companiesModule
    .bind(DI_SYMBOLS.IDeleteCompanyController)
    .toHigherOrderFunction(deleteCompanyController, [
      DI_SYMBOLS.IDeleteCompanyUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return companiesModule;
}
