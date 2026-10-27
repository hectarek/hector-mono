import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type {
  IJobsRepository,
  JobRow,
} from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  type DuplicateJob,
  type Job,
  type JobPage,
  type JobQuery,
  jobSummary,
  type ReviewState,
  statusesFor,
} from "@/src/entities/models/job.model";
import type {
  JobStatusChange,
  LoggedStatusChange,
} from "@/src/entities/models/job-status-change.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

type StoredJob = JobRow & { id: string; updatedAt: Date };

// The jobs in memory, read with their company and lead source as the table's joins read them.
// Like the table, a posting's key is unique per owner, a job needs its company and source, and
// find sorts by next date (none last), then role and id, by code point.
export class MockJobsRepository implements IJobsRepository {
  private readonly rows: { ownerId: string; job: StoredJob }[] = [];
  private moves: {
    ownerId: string;
    jobId: string;
    change: LoggedStatusChange;
  }[] = [];
  private lastMoveId = 0;

  constructor(
    private readonly companies: ICompaniesRepository,
    private readonly sources: ILeadSourcesRepository,
  ) {}

  // The mock's transactions already run one at a time (MockTransactionManagerService).
  async lockQueue(): Promise<void> {}

  async create(ownerId: string, row: JobRow): Promise<Job> {
    if (
      row.postingKey !== null &&
      this.rows.some(
        ({ ownerId: owner, job }) =>
          owner === ownerId && job.postingKey === row.postingKey,
      )
    ) {
      throw new DatabaseOperationError("create failed");
    }
    const job = { ...row, id: crypto.randomUUID(), updatedAt: new Date() };
    this.rows.push({ ownerId, job });
    return this.read(ownerId, job);
  }

  async get(ownerId: string, id: string): Promise<Job | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && this.read(ownerId, row.job);
  }

  async getForUpdate(ownerId: string, id: string): Promise<Job | undefined> {
    return this.get(ownerId, id);
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<JobRow>,
  ): Promise<Job> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("update found no job");
    }
    const given = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    row.job = {
      ...row.job,
      ...given,
      updatedAt: nextUpdatedAt(row.job.updatedAt),
    };
    return this.read(ownerId, row.job);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const index = this.rows.findIndex(
      (row) => row.ownerId === ownerId && row.job.id === id,
    );
    if (index < 0) {
      return;
    }
    this.rows.splice(index, 1);
    // The table's cascade: the job's moves go with it, and only with it.
    this.moves = this.moves.filter((move) => move.jobId !== id);
  }

  async find(
    ownerId: string,
    { status, reviewState, companyId, limit, offset }: JobQuery,
  ): Promise<JobPage> {
    const statuses = statusesFor(status);
    const matching = this.rows
      .filter(
        ({ ownerId: owner, job }) =>
          owner === ownerId &&
          job.reviewState === reviewState &&
          (!statuses || statuses.includes(job.status)) &&
          (!companyId || job.companyId === companyId),
      )
      .map(({ job }) => job)
      .sort(
        (a, b) =>
          byNextDate(a.nextDate, b.nextDate) ||
          byCodePoint(a.role, b.role) ||
          byCodePoint(a.id, b.id),
      );
    const page = await Promise.all(
      matching
        .slice(offset, offset + limit)
        .map(async (job) => jobSummary(await this.read(ownerId, job))),
    );
    return {
      jobs: page,
      nextOffset: matching.length > offset + limit ? offset + limit : null,
    };
  }

  async findByPostingKey(
    ownerId: string,
    postingKey: string,
  ): Promise<DuplicateJob | undefined> {
    const row = this.rows.find(
      ({ ownerId: owner, job }) =>
        owner === ownerId && job.postingKey === postingKey,
    );
    if (!row) {
      return undefined;
    }
    const { id, role, company, reviewState, dismissReason } = await this.read(
      ownerId,
      row.job,
    );
    return { id, role, company: company.name, reviewState, dismissReason };
  }

  async countPending(ownerId: string): Promise<number> {
    return this.rows.filter(
      ({ ownerId: owner, job }) =>
        owner === ownerId && job.reviewState === "pending",
    ).length;
  }

  async countForCompany(
    ownerId: string,
    companyId: string,
  ): Promise<Record<ReviewState, number>> {
    const counts = { pending: 0, accepted: 0, dismissed: 0 };
    for (const { ownerId: owner, job } of this.rows) {
      if (owner === ownerId && job.companyId === companyId) {
        counts[job.reviewState] += 1;
      }
    }
    return counts;
  }

  async addStatusChange(
    ownerId: string,
    jobId: string,
    change: JobStatusChange,
  ): Promise<void> {
    // A serial id, as the table's: never one a deleted move had.
    this.lastMoveId += 1;
    this.moves.push({
      ownerId,
      jobId,
      change: { ...change, id: this.lastMoveId },
    });
  }

  async listStatusChanges(
    ownerId: string,
    jobId: string,
  ): Promise<LoggedStatusChange[]> {
    // The latest logged first.
    return this.moves
      .filter((move) => move.ownerId === ownerId && move.jobId === jobId)
      .reverse()
      .map(({ change }) => ({ ...change }));
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.job.id === id,
    );
  }

  // The job with its company and source, as the table's joins read it.
  private async read(ownerId: string, job: StoredJob): Promise<Job> {
    const company = await this.companies.get(ownerId, job.companyId);
    const source = (await this.sources.list(ownerId)).find(
      ({ id }) => id === job.sourceId,
    );
    if (!company || !source) {
      throw new DatabaseOperationError("A job's company or source is missing");
    }
    const { companyId, sourceId, postingKey, ...rest } = job;
    return {
      ...rest,
      company: { id: company.id, name: company.name, tier: company.tier },
      source,
    };
  }
}

// Earlier dates first, and no date last.
function byNextDate(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return byCodePoint(a, b);
}
