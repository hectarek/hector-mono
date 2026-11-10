import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  refuseDuplicate,
  requireCompany,
} from "@/src/application/use-cases/jobs/job-checks";
import { sourceNamed } from "@/src/application/use-cases/sources/source-named";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Job,
  jobLogged,
  type NewJobInput,
} from "@/src/entities/models/job.model";
import { NO_STEP, withStepDate } from "@/src/entities/next-step";
import { postingKey } from "@/src/entities/posting-link";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ICreateJobUseCase = ReturnType<typeof createJobUseCase>;

// A new job (R1, R20 as revised 2026-11-10): Hector's or Claude's, it joins the ranked list at
// once (R27), in verify with no next step unless one is given. Claude's always carries its
// posting's link, for the duplicate rule, and its reason, for Hector, whatever the entry point
// (KTD3). A posting already on a job, archived ones included, is refused as a duplicate, checked
// under the posting lock (KTD8). The source is found by name, or added.
export const createJobUseCase = (
  jobsRepository: IJobsRepository,
  companiesRepository: ICompaniesRepository,
  leadSourcesRepository: ILeadSourcesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createJob" });

  return async (context: ChangeContext, input: NewJobInput): Promise<Job> => {
    const { ownerId } = context;
    if (context.actor === "agent" && !(input.postingUrl && input.reason)) {
      throw new InputParseError(
        "A job Claude adds needs the posting's link and a reason.",
      );
    }
    const today = todayIn(PLAN_TIME_ZONE);
    const key = input.postingUrl ? postingKey(input.postingUrl) : null;
    // A step given no date is a week out (R1 as revised 2026-11-07, the UX plan's Q1).
    const { nextStep, nextDate } = withStepDate(
      { nextStep: input.nextStep ?? null, nextDate: input.nextDate ?? null },
      NO_STEP,
      today,
    );

    const job = await transactionManager.startTransaction(async (tx) => {
      await jobsRepository.lockPostings(ownerId, tx);
      if (key) {
        await refuseDuplicate(jobsRepository, ownerId, key, tx);
      }
      await requireCompany(companiesRepository, ownerId, input.companyId, tx);
      const { source } = await sourceNamed(
        leadSourcesRepository,
        activityRepository,
        tx,
        context,
        input.source,
      );
      const created = await jobsRepository.create(
        ownerId,
        {
          companyId: input.companyId,
          clientName: input.clientName ?? null,
          role: input.role,
          nextStep,
          nextDate,
          appliedOn: null,
          targetRole: input.targetRole ?? null,
          level: input.level ?? null,
          location: input.location ?? null,
          workMode: input.workMode ?? null,
          payMin: input.payMin ?? null,
          payMax: input.payMax ?? null,
          postingUrl: input.postingUrl ?? null,
          postingKey: key,
          postedOn: input.postedOn ?? null,
          summary: input.summary ?? null,
          reason: input.reason ?? null,
          score: input.score ?? null,
          foundOn: input.foundOn ?? today,
          sourceId: source.id,
          travelPercent: input.travelPercent ?? null,
          employmentType: input.employmentType ?? null,
          teamSize: input.teamSize ?? null,
          status: "verify",
          pinnedAt: null,
        },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "job", id: created.id },
        action: "created",
        after: jobLogged(created),
      });
      return created;
    });
    logger.info("Job created", { jobId: job.id });
    return job;
  };
};
