import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type {
  IJobsRepository,
  JobRow,
} from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  refuseDuplicate,
  requireCompany,
} from "@/src/application/use-cases/jobs/job-checks";
import { sourceNamed } from "@/src/application/use-cases/sources/source-named";
import {
  ConflictError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Job,
  jobLogged,
  type UpdateJobInput,
} from "@/src/entities/models/job.model";
import { postingKey } from "@/src/entities/posting-link";

export type IUpdateJobUseCase = ReturnType<typeof updateJobUseCase>;

// The facts a change sets as given, compared with the job's own.
const PLAIN_FACTS = [
  "clientName",
  "role",
  "nextStep",
  "nextDate",
  "appliedOn",
  "targetRole",
  "level",
  "location",
  "workMode",
  "payMin",
  "payMax",
  "summary",
  "foundOn",
  "travelPercent",
  "employmentType",
  "teamSize",
] as const;

// Changes a job's facts (update_job, the job form; R1), against the updatedAt read with it (R22).
// Its status moves only with a status move and its review only with Hector's call; Claude sets
// applied-on only with a dated status move, and leaves a dismissed proposal as Hector left it, so
// its posting stays refused (KTD3, R20), whatever the entry point. A new posting link is checked
// for a duplicate, and a source is found by name, or added. A change that sets what's already
// there writes and logs nothing.
export const updateJobUseCase = (
  jobsRepository: IJobsRepository,
  companiesRepository: ICompaniesRepository,
  leadSourcesRepository: ILeadSourcesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "updateJob" });

  return async (
    context: ChangeContext,
    { id, updatedAt, companyId, postingUrl, source, ...given }: UpdateJobInput,
  ): Promise<Job> => {
    const { ownerId } = context;
    if (context.actor !== "owner" && given.appliedOn !== undefined) {
      throw new InputParseError(
        "Applied-on changes with a dated status move: use set_job_status.",
      );
    }

    const job = await transactionManager.startTransaction(async (tx) => {
      const current = await jobsRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that job.");
      }
      if (current.reviewState === "dismissed" && context.actor !== "owner") {
        throw new InputParseError(
          "A dismissed proposal changes once Hector reopens it.",
        );
      }
      if (current.updatedAt.getTime() !== updatedAt.getTime()) {
        throw new ConflictError(current);
      }

      const changes: Partial<JobRow> = {};
      for (const fact of PLAIN_FACTS) {
        const value = given[fact];
        if (value !== undefined && value !== current[fact]) {
          Object.assign(changes, { [fact]: value });
        }
      }
      // A cleared bound is null in the changes, not missing from them.
      const payMin =
        changes.payMin !== undefined ? changes.payMin : current.payMin;
      const payMax =
        changes.payMax !== undefined ? changes.payMax : current.payMax;
      if (payMin !== null && payMax !== null && payMax < payMin) {
        throw new InputParseError("The top of the band is below its bottom.");
      }
      if (companyId !== undefined && companyId !== current.company.id) {
        await requireCompany(companiesRepository, ownerId, companyId, tx);
        changes.companyId = companyId;
      }
      if (postingUrl !== undefined && postingUrl !== current.postingUrl) {
        const key = postingUrl ? postingKey(postingUrl) : null;
        if (key) {
          await jobsRepository.lockQueue(ownerId, tx);
          await refuseDuplicate(jobsRepository, ownerId, key, tx, id);
        }
        changes.postingUrl = postingUrl;
        changes.postingKey = key;
      }
      if (source !== undefined) {
        const named = await sourceNamed(
          leadSourcesRepository,
          activityRepository,
          tx,
          context,
          source,
        );
        if (named.source.id !== current.source.id) {
          changes.sourceId = named.source.id;
        }
      }
      if (Object.keys(changes).length === 0) {
        return current;
      }

      const updated = await jobsRepository.update(ownerId, id, changes, tx);
      await recordChange(activityRepository, tx, context, {
        record: { kind: "job", id },
        action: "updated",
        before: jobLogged(current),
        after: jobLogged(updated),
      });
      return updated;
    });
    logger.info("Job saved", { jobId: id });
    return job;
  };
};
