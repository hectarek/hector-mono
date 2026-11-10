import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { companies, jobStatusChanges, jobs, leadSources } from "@/db/schema";
import type {
  IJobsRepository,
  JobRow,
} from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { type JobStatus, OPEN_STATUSES } from "@/src/entities/job-lifecycle";
import {
  type DuplicateJob,
  type Job,
  type JobPage,
  type JobQuery,
  type JobSummary,
  jobSummary,
  statusesFor,
} from "@/src/entities/models/job.model";
import type {
  JobStatusChange,
  LoggedStatusChange,
} from "@/src/entities/models/job-status-change.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { TO_APPLY_STATUSES } from "@/src/entities/rank";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

// A job as the app reads it, its company and lead source by name too.
const JOB = {
  id: jobs.id,
  clientName: jobs.clientName,
  role: jobs.role,
  nextStep: jobs.nextStep,
  nextDate: jobs.nextDate,
  appliedOn: jobs.appliedOn,
  targetRole: jobs.targetRole,
  level: jobs.level,
  location: jobs.location,
  workMode: jobs.workMode,
  payMin: jobs.payMin,
  payMax: jobs.payMax,
  postingUrl: jobs.postingUrl,
  postedOn: jobs.postedOn,
  summary: jobs.summary,
  reason: jobs.proposalReason,
  score: jobs.score,
  foundOn: jobs.foundOn,
  travelPercent: jobs.travelPercent,
  employmentType: jobs.employmentType,
  teamSize: jobs.teamSize,
  status: jobs.status,
  pinnedAt: jobs.pinnedAt,
  updatedAt: jobs.updatedAt,
  company: { id: companies.id, name: companies.name, tier: companies.tier },
  source: { id: leadSources.id, name: leadSources.name },
};

// A job's row as the table holds it: Claude's reason sits in proposal_reason, the column it had
// when only proposals carried one (U19).
function columnsOf<T extends Partial<JobRow>>({ reason, ...rest }: T) {
  return reason === undefined ? rest : { ...rest, proposalReason: reason };
}

// A next step with no date.
const UNDATED = and(isNotNull(jobs.nextStep), isNull(jobs.nextDate));

export class JobsRepository extends BaseRepository implements IJobsRepository {
  constructor(logger: ILoggerService) {
    super(logger, "jobs");
  }

  async lockPostings(ownerId: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).execute(
        sql`select pg_advisory_xact_lock(hashtext(${`jobs:${ownerId}`}))`,
      );
    } catch (err) {
      this.handleError(err, "lockPostings", { ownerId });
    }
  }

  async create(ownerId: string, row: JobRow, tx: ITransaction): Promise<Job> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(jobs)
        .values({ ownerId, ...columnsOf(row) })
        .returning({ id: jobs.id });
      const job = created && (await this.read(ownerId, created.id, tx));
      if (!job) {
        throw new DatabaseOperationError("create returned no job");
      }
      return job;
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async get(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<Job | undefined> {
    try {
      return await this.read(ownerId, id, tx);
    } catch (err) {
      this.handleError(err, "get", { ownerId, jobId: id });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Job | undefined> {
    try {
      const [job] = await this.joined(tx)
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.id, id)))
        .for("update", { of: jobs });
      return job;
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, jobId: id });
    }
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<JobRow>,
    tx: ITransaction,
  ): Promise<Job> {
    try {
      const [updated] = await this.getDbContext(tx)
        .update(jobs)
        .set({
          ...columnsOf(changes),
          updatedAt: nextUpdatedAt(jobs.updatedAt),
        })
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.id, id)))
        .returning({ id: jobs.id });
      const job = updated && (await this.read(ownerId, updated.id, tx));
      if (!job) {
        throw new DatabaseOperationError("update found no job");
      }
      return job;
    } catch (err) {
      this.handleError(err, "update", { ownerId, jobId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(jobs)
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, jobId: id });
    }
  }

  async find(
    ownerId: string,
    { status, companyId, undated, limit, offset }: JobQuery,
  ): Promise<JobPage> {
    const statuses = statusesFor(status);
    try {
      // One more than the page, to tell whether another follows. Roles sort by code point
      // ("C"), as the mock sorts them.
      const rows = await this.joined()
        .where(
          and(
            eq(jobs.ownerId, ownerId),
            statuses ? inArray(jobs.status, [...statuses]) : undefined,
            companyId ? eq(jobs.companyId, companyId) : undefined,
            undated ? UNDATED : undefined,
          ),
        )
        .orderBy(
          sql`${jobs.nextDate} asc nulls last`,
          sql`${jobs.role} collate "C"`,
          jobs.id,
        )
        .limit(limit + 1)
        .offset(offset);
      return {
        jobs: rows.slice(0, limit).map(jobSummary),
        nextOffset: rows.length > limit ? offset + limit : null,
      };
    } catch (err) {
      this.handleError(err, "find", { ownerId });
    }
  }

  async listDue(ownerId: string, day: string): Promise<JobSummary[]> {
    try {
      const rows = await this.joined()
        .where(
          and(
            eq(jobs.ownerId, ownerId),
            inArray(jobs.status, [...OPEN_STATUSES]),
            lte(jobs.nextDate, day),
          ),
        )
        .orderBy(asc(jobs.nextDate), sql`${jobs.role} collate "C"`, jobs.id);
      return rows.map(jobSummary);
    } catch (err) {
      this.handleError(err, "listDue", { ownerId });
    }
  }

  async countUndated(ownerId: string): Promise<number> {
    try {
      const [row] = await this.getDbContext()
        .select({ jobs: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.ownerId, ownerId),
            inArray(jobs.status, [...OPEN_STATUSES]),
            UNDATED,
          ),
        );
      return row?.jobs ?? 0;
    } catch (err) {
      this.handleError(err, "countUndated", { ownerId });
    }
  }

  async listAppliedBy(ownerId: string, day: string): Promise<JobSummary[]> {
    try {
      const rows = await this.joined()
        .where(
          and(
            eq(jobs.ownerId, ownerId),
            eq(jobs.status, "applied"),
            lte(jobs.appliedOn, day),
          ),
        )
        .orderBy(asc(jobs.appliedOn), sql`${jobs.role} collate "C"`, jobs.id);
      return rows.map(jobSummary);
    } catch (err) {
      this.handleError(err, "listAppliedBy", { ownerId });
    }
  }

  async countApplied(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<number> {
    try {
      const [row] = await this.getDbContext()
        .select({ applied: count() })
        .from(jobs)
        .where(
          and(eq(jobs.ownerId, ownerId), between(jobs.appliedOn, from, to)),
        );
      return row?.applied ?? 0;
    } catch (err) {
      this.handleError(err, "countApplied", { ownerId });
    }
  }

  async countMovesInto(
    ownerId: string,
    statuses: readonly JobStatus[],
    from: string,
    to: string,
  ): Promise<number> {
    try {
      const [row] = await this.getDbContext()
        .select({ moves: count() })
        .from(jobStatusChanges)
        .where(
          and(
            eq(jobStatusChanges.ownerId, ownerId),
            inArray(jobStatusChanges.toStatus, [...statuses]),
            between(jobStatusChanges.occurredOn, from, to),
          ),
        );
      return row?.moves ?? 0;
    } catch (err) {
      this.handleError(err, "countMovesInto", { ownerId });
    }
  }

  async findByPostingKey(
    ownerId: string,
    postingKey: string,
    tx: ITransaction,
  ): Promise<DuplicateJob | undefined> {
    try {
      const [job] = await this.getDbContext(tx)
        .select({
          id: jobs.id,
          role: jobs.role,
          company: companies.name,
          status: jobs.status,
        })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.postingKey, postingKey)));
      return job;
    } catch (err) {
      this.handleError(err, "findByPostingKey", { ownerId });
    }
  }

  async listToApply(ownerId: string): Promise<Job[]> {
    try {
      return await this.joined().where(
        and(
          eq(jobs.ownerId, ownerId),
          inArray(jobs.status, [...TO_APPLY_STATUSES]),
        ),
      );
    } catch (err) {
      this.handleError(err, "listToApply", { ownerId });
    }
  }

  async countForCompany(
    ownerId: string,
    companyId: string,
    tx: ITransaction,
  ): Promise<number> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ jobs: count() })
        .from(jobs)
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.companyId, companyId)));
      return row?.jobs ?? 0;
    } catch (err) {
      this.handleError(err, "countForCompany", { ownerId, companyId });
    }
  }

  async addStatusChange(
    ownerId: string,
    jobId: string,
    { from, to, on, actor }: JobStatusChange,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx).insert(jobStatusChanges).values({
        ownerId,
        jobId,
        fromStatus: from,
        toStatus: to,
        occurredOn: on,
        actor,
      });
    } catch (err) {
      this.handleError(err, "addStatusChange", { ownerId, jobId });
    }
  }

  async listStatusChanges(
    ownerId: string,
    jobId: string,
  ): Promise<LoggedStatusChange[]> {
    try {
      return await this.getDbContext()
        .select({
          id: jobStatusChanges.id,
          from: jobStatusChanges.fromStatus,
          to: jobStatusChanges.toStatus,
          on: jobStatusChanges.occurredOn,
          actor: jobStatusChanges.actor,
        })
        .from(jobStatusChanges)
        .where(
          and(
            eq(jobStatusChanges.ownerId, ownerId),
            eq(jobStatusChanges.jobId, jobId),
          ),
        )
        .orderBy(desc(jobStatusChanges.id));
    } catch (err) {
      this.handleError(err, "listStatusChanges", { ownerId, jobId });
    }
  }

  // Jobs with their company and lead source.
  private joined(tx?: ITransaction) {
    return this.getDbContext(tx)
      .select(JOB)
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .innerJoin(leadSources, eq(leadSources.id, jobs.sourceId));
  }

  private async read(
    ownerId: string,
    id: string,
    tx?: ITransaction,
  ): Promise<Job | undefined> {
    const [job] = await this.joined(tx).where(
      and(eq(jobs.ownerId, ownerId), eq(jobs.id, id)),
    );
    return job;
  }
}
