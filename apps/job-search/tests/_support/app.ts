// Every use case wired to one set of repositories, plus a few fictional ids, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories over PGlite (preload.ts points "@/db" at it). Recipes' harness.
import { beforeEach, describe } from "bun:test";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { listActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import { deleteCompanyUseCase } from "@/src/application/use-cases/companies/delete-company.use-case";
import { findCompaniesUseCase } from "@/src/application/use-cases/companies/find-companies.use-case";
import { getCompanyUseCase } from "@/src/application/use-cases/companies/get-company.use-case";
import { saveCompanyUseCase } from "@/src/application/use-cases/companies/save-company.use-case";
import { deleteInteractionUseCase } from "@/src/application/use-cases/interactions/delete-interaction.use-case";
import { logInteractionUseCase } from "@/src/application/use-cases/interactions/log-interaction.use-case";
import { createJobUseCase } from "@/src/application/use-cases/jobs/create-job.use-case";
import { deleteJobUseCase } from "@/src/application/use-cases/jobs/delete-job.use-case";
import { findJobsUseCase } from "@/src/application/use-cases/jobs/find-jobs.use-case";
import { getJobUseCase } from "@/src/application/use-cases/jobs/get-job.use-case";
import { moveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import { reviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import { updateJobUseCase } from "@/src/application/use-cases/jobs/update-job.use-case";
import { addNoteUseCase } from "@/src/application/use-cases/notes/add-note.use-case";
import { deleteNoteUseCase } from "@/src/application/use-cases/notes/delete-note.use-case";
import { editNoteUseCase } from "@/src/application/use-cases/notes/edit-note.use-case";
import { addPersonUseCase } from "@/src/application/use-cases/people/add-person.use-case";
import { deletePersonUseCase } from "@/src/application/use-cases/people/delete-person.use-case";
import { findPeopleUseCase } from "@/src/application/use-cases/people/find-people.use-case";
import { getPersonUseCase } from "@/src/application/use-cases/people/get-person.use-case";
import { removeContactUseCase } from "@/src/application/use-cases/people/remove-contact.use-case";
import { updatePersonUseCase } from "@/src/application/use-cases/people/update-person.use-case";
import { deletePracticeEntryUseCase } from "@/src/application/use-cases/practice/delete-practice-entry.use-case";
import { getPracticeSessionUseCase } from "@/src/application/use-cases/practice/get-practice-session.use-case";
import { listPracticeUseCase } from "@/src/application/use-cases/practice/list-practice.use-case";
import { logPracticeUseCase } from "@/src/application/use-cases/practice/log-practice.use-case";
import { startSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { getSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import { updateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import { addSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import { listSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import { getTodayUseCase } from "@/src/application/use-cases/week/get-today.use-case";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import { MockActivityRepository } from "@/src/infrastructure/repositories/activity.repository.mock";
import { CompaniesRepository } from "@/src/infrastructure/repositories/companies.repository";
import { MockCompaniesRepository } from "@/src/infrastructure/repositories/companies.repository.mock";
import { InteractionsRepository } from "@/src/infrastructure/repositories/interactions.repository";
import { MockInteractionsRepository } from "@/src/infrastructure/repositories/interactions.repository.mock";
import { JobsRepository } from "@/src/infrastructure/repositories/jobs.repository";
import { MockJobsRepository } from "@/src/infrastructure/repositories/jobs.repository.mock";
import { LeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository";
import { MockLeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository.mock";
import { NotesRepository } from "@/src/infrastructure/repositories/notes.repository";
import { MockNotesRepository } from "@/src/infrastructure/repositories/notes.repository.mock";
import { PeopleRepository } from "@/src/infrastructure/repositories/people.repository";
import { MockPeopleRepository } from "@/src/infrastructure/repositories/people.repository.mock";
import { PracticeRepository } from "@/src/infrastructure/repositories/practice.repository";
import { MockPracticeRepository } from "@/src/infrastructure/repositories/practice.repository.mock";
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
  jobs: IJobsRepository;
  notes: INotesRepository;
  people: IPeopleRepository;
  interactions: IInteractionsRepository;
  practice: IPracticeRepository;
  transactions: ITransactionManagerService;
};

function mockRepositories(): Repositories {
  const companies = new MockCompaniesRepository();
  const sources = new MockLeadSourcesRepository();
  return {
    activity: new MockActivityRepository(),
    companies,
    sources,
    settings: new MockSettingsRepository(),
    jobs: new MockJobsRepository(companies, sources),
    notes: new MockNotesRepository(),
    people: new MockPeopleRepository(companies),
    interactions: new MockInteractionsRepository(),
    practice: new MockPracticeRepository(),
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
    jobs: new JobsRepository(log),
    notes: new NotesRepository(log),
    people: new PeopleRepository(log),
    interactions: new InteractionsRepository(log),
    practice: new PracticeRepository(log),
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
  const {
    activity,
    companies,
    sources,
    settings,
    jobs,
    notes,
    people,
    interactions,
    practice,
    transactions,
  } = repos;
  return {
    repos,
    listActivity: listActivityUseCase(activity, log),
    startSession: startSessionUseCase(activity, transactions, log),
    findCompanies: findCompaniesUseCase(companies, log),
    getCompany: getCompanyUseCase(companies, jobs, people, log),
    saveCompany: saveCompanyUseCase(companies, activity, transactions, log),
    deleteCompany: deleteCompanyUseCase(
      companies,
      jobs,
      people,
      activity,
      transactions,
      log,
    ),
    addSource: addSourceUseCase(sources, activity, transactions, log),
    listSources: listSourcesUseCase(sources, log),
    getSettings: getSettingsUseCase(settings),
    updateSettings: updateSettingsUseCase(
      settings,
      activity,
      transactions,
      log,
    ),
    findJobs: findJobsUseCase(jobs, log),
    getJob: getJobUseCase(jobs, notes, activity, people, interactions, log),
    createJob: createJobUseCase(
      jobs,
      companies,
      sources,
      settings,
      activity,
      transactions,
      log,
    ),
    updateJob: updateJobUseCase(
      jobs,
      companies,
      sources,
      activity,
      transactions,
      log,
    ),
    moveJob: moveJobUseCase(jobs, activity, transactions, log),
    reviewProposal: reviewProposalUseCase(jobs, activity, transactions, log),
    deleteJob: deleteJobUseCase(
      jobs,
      notes,
      people,
      interactions,
      activity,
      transactions,
      log,
    ),
    addNote: addNoteUseCase(notes, jobs, activity, transactions, log),
    editNote: editNoteUseCase(notes, activity, transactions, log),
    deleteNote: deleteNoteUseCase(notes, activity, transactions, log),
    findPeople: findPeopleUseCase(people, interactions, log),
    getPerson: getPersonUseCase(people, interactions, jobs, log),
    addPerson: addPersonUseCase(
      people,
      companies,
      jobs,
      activity,
      transactions,
      log,
    ),
    updatePerson: updatePersonUseCase(
      people,
      companies,
      interactions,
      activity,
      transactions,
      log,
    ),
    deletePerson: deletePersonUseCase(
      people,
      interactions,
      activity,
      transactions,
      log,
    ),
    removeContact: removeContactUseCase(
      people,
      jobs,
      activity,
      transactions,
      log,
    ),
    logInteraction: logInteractionUseCase(
      interactions,
      people,
      jobs,
      activity,
      transactions,
      log,
    ),
    deleteInteraction: deleteInteractionUseCase(
      interactions,
      activity,
      transactions,
      log,
    ),
    listPractice: listPracticeUseCase(practice),
    getPracticeSession: getPracticeSessionUseCase(practice),
    logPractice: logPracticeUseCase(practice, activity, transactions, log),
    deletePracticeEntry: deletePracticeEntryUseCase(
      practice,
      activity,
      transactions,
      log,
    ),
    getToday: getTodayUseCase(
      jobs,
      people,
      interactions,
      practice,
      activity,
      settings,
      log,
    ),
  };
}

export type TestApp = ReturnType<typeof makeApp>;
