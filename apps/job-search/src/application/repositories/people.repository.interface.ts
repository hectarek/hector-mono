import type {
  PeopleQuery,
  PersonFacts,
  PersonRecord,
  PersonRef,
} from "@/src/entities/models/person.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An owner's people and their links to jobs (docs/build-plan.md U7). Every method takes the
// owner's id (KTD2). A person's dates come from their interactions (KTD9), so these read people as
// stored.
export interface IPeopleRepository {
  create(
    ownerId: string,
    facts: PersonFacts,
    tx: ITransaction,
  ): Promise<PersonRecord>;
  get(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<PersonRecord | undefined>;
  // The person, read for a change: they stay locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<PersonRecord | undefined>;
  // Sets the given facts and moves updatedAt on. The use case has read the person first.
  update(
    ownerId: string,
    id: string,
    changes: Partial<PersonFacts>,
    tx: ITransaction,
  ): Promise<PersonRecord>;
  // Deletes the person and their links to jobs.
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // By name, a page at a time.
  find(
    ownerId: string,
    query: PeopleQuery,
  ): Promise<{ people: PersonRecord[]; nextOffset: number | null }>;
  // A company's people, by name.
  listForCompany(ownerId: string, companyId: string): Promise<PersonRef[]>;
  countForCompany(
    ownerId: string,
    companyId: string,
    tx: ITransaction,
  ): Promise<number>;
  // A job's contacts, by name.
  listForJob(ownerId: string, jobId: string): Promise<PersonRef[]>;
  // The jobs a person is a contact for, the first linked first.
  jobIdsFor(
    ownerId: string,
    personId: string,
    tx?: ITransaction,
  ): Promise<string[]>;
  // Makes the person one of the job's contacts. A link made twice is kept once.
  linkJob(
    ownerId: string,
    personId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void>;
  unlinkJob(
    ownerId: string,
    personId: string,
    jobId: string,
    tx: ITransaction,
  ): Promise<void>;
  // Every contact link a job has, with the job's delete.
  unlinkAllFor(ownerId: string, jobId: string, tx: ITransaction): Promise<void>;
}
