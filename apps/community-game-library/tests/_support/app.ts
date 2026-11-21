// Every use case wired to one set of repositories, so a test reads like the feature. Inside
// describeEachBackend the same tests run twice: on the in-memory mocks and on the real
// repositories (PGlite). Recipes' harness: each unit adds its repositories and use cases here.
import { beforeEach, describe } from "bun:test";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { resetDatabase } from "@/tests/_support/database";

type Repositories = {
  transactions: ITransactionManagerService;
};

function mockRepositories(): Repositories {
  return {
    transactions: new MockTransactionManagerService(),
  };
}

// The real repositories, over the PGlite test database (see preload.ts).
function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
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

// Runs the block once per backend. Inside it, makeApp() uses that backend's repositories,
// and the database is emptied before each test. A test that passes on "mock" but fails
// on "postgres" means the mock has drifted from the real SQL.
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
  return { repos };
}
