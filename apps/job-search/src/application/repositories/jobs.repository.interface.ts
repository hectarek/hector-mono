import type {
  DuplicateJob,
  Job,
  JobFacts,
  JobPage,
  JobQuery,
  JobState,
  ReviewState,
} from "@/src/entities/models/job.model";
import type {
  JobStatusChange,
  LoggedStatusChange,
} from "@/src/entities/models/job-status-change.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A job as it's written: its facts, where it stands, and its posting's key (posting-link.ts).
export type JobRow = JobFacts & JobState & { postingKey: string | null };

// An owner's jobs and their status moves (docs/build-plan.md U6). Every method takes the owner's
// id (KTD2), and every read but find sees any review state.
export interface IJobsRepository {
  // Holds the owner's queue and postings until the transaction ends, so a check against them (a
  // duplicate posting, the pending cap) and the write after it see the same jobs (KTD8).
  lockQueue(ownerId: string, tx: ITransaction): Promise<void>;
  create(ownerId: string, row: JobRow, tx: ITransaction): Promise<Job>;
  get(ownerId: string, id: string, tx?: ITransaction): Promise<Job | undefined>;
  // The job, read for a change: it stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Job | undefined>;
  // Sets what's given and moves updatedAt on. The use case has read the job first.
  update(
    ownerId: string,
    id: string,
    changes: Partial<JobRow>,
    tx: ITransaction,
  ): Promise<Job>;
  // Deletes the job and its status moves.
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // Accepted jobs unless the query asks for another review state, by next date (none last), then
  // role, a page at a time.
  find(ownerId: string, query: JobQuery): Promise<JobPage>;
  // The job that holds a posting, whatever its review.
  findByPostingKey(
    ownerId: string,
    postingKey: string,
    tx: ITransaction,
  ): Promise<DuplicateJob | undefined>;
  countPending(ownerId: string, tx: ITransaction): Promise<number>;
  // Every job at a company, counted by its review.
  countForCompany(
    ownerId: string,
    companyId: string,
    tx: ITransaction,
  ): Promise<Record<ReviewState, number>>;
  addStatusChange(
    ownerId: string,
    jobId: string,
    change: JobStatusChange,
    tx: ITransaction,
  ): Promise<void>;
  // A job's moves, the latest logged first: the order they chain in, whatever their dates.
  listStatusChanges(
    ownerId: string,
    jobId: string,
  ): Promise<LoggedStatusChange[]>;
}
