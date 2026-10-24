// Every use case wired to one set of repositories, plus a few fictional ids, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories over PGlite (preload.ts points "@/db" at it). Recipes' harness.
import { beforeEach, describe } from "bun:test";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { listActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import { startSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import { MockActivityRepository } from "@/src/infrastructure/repositories/activity.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { resetDatabase } from "@/tests/_support/database";

// Whose rows a test works on: the owner's, and another owner's that must stay out.
export const OWNER = "00000000-0000-4000-8000-000000000001";
export const ANOTHER_OWNER = "00000000-0000-4000-8000-000000000002";

type Repositories = {
  activity: IActivityRepository;
  transactions: ITransactionManagerService;
};

function mockRepositories(): Repositories {
  return {
    activity: new MockActivityRepository(),
    transactions: new MockTransactionManagerService(),
  };
}

// The real repositories, over the PGlite test database.
export function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
    activity: new ActivityRepository(log),
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
  return {
    repos,
    listActivity: listActivityUseCase(repos.activity, log),
    startSession: startSessionUseCase(repos.activity, repos.transactions, log),
  };
}

export type TestApp = ReturnType<typeof makeApp>;
