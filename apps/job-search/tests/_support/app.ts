// Every use case wired to one set of repositories, plus a few fictional ids, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories over PGlite (preload.ts points "@/db" at it). Recipes' harness.
import { beforeEach, describe } from "bun:test";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { listActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import { deleteCompanyUseCase } from "@/src/application/use-cases/companies/delete-company.use-case";
import { findCompaniesUseCase } from "@/src/application/use-cases/companies/find-companies.use-case";
import { getCompanyUseCase } from "@/src/application/use-cases/companies/get-company.use-case";
import { saveCompanyUseCase } from "@/src/application/use-cases/companies/save-company.use-case";
import { startSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { getSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import { updateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import { addSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import { listSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import { MockActivityRepository } from "@/src/infrastructure/repositories/activity.repository.mock";
import { CompaniesRepository } from "@/src/infrastructure/repositories/companies.repository";
import { MockCompaniesRepository } from "@/src/infrastructure/repositories/companies.repository.mock";
import { LeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository";
import { MockLeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository.mock";
import { SettingsRepository } from "@/src/infrastructure/repositories/settings.repository";
import { MockSettingsRepository } from "@/src/infrastructure/repositories/settings.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { resetDatabase } from "@/tests/_support/database";

// Whose rows a test works on: the owner's, and another owner's that must stay out.
export const OWNER = "00000000-0000-4000-8000-000000000001";
export const ANOTHER_OWNER = "00000000-0000-4000-8000-000000000002";

type Repositories = {
  activity: IActivityRepository;
  companies: ICompaniesRepository;
  sources: ILeadSourcesRepository;
  settings: ISettingsRepository;
  transactions: ITransactionManagerService;
};

function mockRepositories(): Repositories {
  return {
    activity: new MockActivityRepository(),
    companies: new MockCompaniesRepository(),
    sources: new MockLeadSourcesRepository(),
    settings: new MockSettingsRepository(),
    transactions: new MockTransactionManagerService(),
  };
}

// The real repositories, over the PGlite test database.
export function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
    activity: new ActivityRepository(log),
    companies: new CompaniesRepository(log),
    sources: new LeadSourcesRepository(log),
    settings: new SettingsRepository(log),
    transactions: new TransactionManagerService(log),
  };
}

type Backend = {
  name: string;
  reset: () => Promise<void>;
  repositories: () => Repositories;
};
const MOCK: Backend = {
  name: "mock",
  reset: async () => {},
  repositories: mockRepositories,
};
const POSTGRES: Backend = {
  name: "postgres",
  reset: resetDatabase,
  repositories: postgresRepositories,
};
// Outside describeEachBackend, makeApp() uses the mocks.
let currentBackend = MOCK;

// Runs the block once per backend. Inside it, makeApp() uses that backend's repositories, and
// the database is emptied before each test. A test that passes on "mock" but fails on
// "postgres" means the mock has drifted from the real SQL.
export function describeEachBackend(name: string, fn: () => void): void {
  for (const backend of [MOCK, POSTGRES]) {
    describe(`${name} [${backend.name}]`, () => {
      beforeEach(async () => {
        currentBackend = backend;
        await backend.reset();
      });
      fn();
    });
  }
}

export function makeApp(repos: Repositories = currentBackend.repositories()) {
  const log = new MockLoggerService();
  const { activity, companies, sources, settings, transactions } = repos;
  return {
    repos,
    listActivity: listActivityUseCase(activity, log),
    startSession: startSessionUseCase(activity, transactions, log),
    findCompanies: findCompaniesUseCase(companies, log),
    getCompany: getCompanyUseCase(companies, log),
    saveCompany: saveCompanyUseCase(companies, activity, transactions, log),
    deleteCompany: deleteCompanyUseCase(companies, activity, transactions, log),
    addSource: addSourceUseCase(sources, activity, transactions, log),
    listSources: listSourcesUseCase(sources, log),
    getSettings: getSettingsUseCase(settings),
    updateSettings: updateSettingsUseCase(
      settings,
      activity,
      transactions,
      log,
    ),
  };
}

export type TestApp = ReturnType<typeof makeApp>;
