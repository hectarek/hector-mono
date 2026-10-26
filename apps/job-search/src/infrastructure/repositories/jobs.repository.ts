import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { companies, jobStatusChanges, jobs, leadSources } from "@/db/schema";
import type {
  IJobsRepository,
  JobRow,
} from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import {
  type DuplicateJob,
  type Job,
  type JobPage,
  type JobQuery,
  jobSummary,
  statusesFor,
} from "@/src/entities/models/job.model";
import type {
  JobStatusChange,
  LoggedStatusChange,
} from "@/src/entities/models/job-status-change.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

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
  summary: jobs.summary,
  foundOn: jobs.foundOn,
  travelPercent: jobs.travelPercent,
  employmentType: jobs.employmentType,
  teamSize: jobs.teamSize,
  status: jobs.status,
  reviewState: jobs.reviewState,
  proposalReason: jobs.proposalReason,
  dismissReason: jobs.dismissReason,
  dismissNote: jobs.dismissNote,
  updatedAt: jobs.updatedAt,
  company: { id: companies.id, name: companies.name, tier: companies.tier },
  source: { id: leadSources.id, name: leadSources.name },
};

export class JobsRepository extends BaseRepository implements IJobsRepository {
  constructor(logger: ILoggerService) {
    super(logger, "jobs");
  }

  async lockQueue(ownerId: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).execute(
        sql`select pg_advisory_xact_lock(hashtext(${`jobs:${ownerId}`}))`,
      );
    } catch (err) {
      this.handleError(err, "lockQueue", { ownerId });
    }
  }

  async create(ownerId: string, row: JobRow, tx: ITransaction): Promise<Job> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(jobs)
        .values({ ownerId, ...row })
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
          ...changes,
          // On by at least a millisecond, so the change shows to anyone holding the old value.
          updatedAt: sql`greatest(date_trunc('milliseconds', now()), ${jobs.updatedAt} + interval '1 millisecond')`,
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
    { status, reviewState, companyId, limit, offset }: JobQuery,
  ): Promise<JobPage> {
    const statuses = statusesFor(status);
    try {
      // One more than the page, to tell whether another follows. Roles sort by code point
      // ("C"), as the mock sorts them.
      const rows = await this.joined()
        .where(
          and(
            eq(jobs.ownerId, ownerId),
            eq(jobs.reviewState, reviewState),
            statuses ? inArray(jobs.status, [...statuses]) : undefined,
            companyId ? eq(jobs.companyId, companyId) : undefined,
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
          reviewState: jobs.reviewState,
          dismissReason: jobs.dismissReason,
        })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.postingKey, postingKey)));
      return job;
    } catch (err) {
      this.handleError(err, "findByPostingKey", { ownerId });
    }
  }

  async countPending(ownerId: string, tx: ITransaction): Promise<number> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ pending: count() })
        .from(jobs)
        .where(and(eq(jobs.ownerId, ownerId), eq(jobs.reviewState, "pending")));
      return row?.pending ?? 0;
    } catch (err) {
      this.handleError(err, "countPending", { ownerId });
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
