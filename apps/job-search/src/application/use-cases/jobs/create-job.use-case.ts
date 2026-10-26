import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  refuseDuplicate,
  requireCompany,
} from "@/src/application/use-cases/jobs/job-checks";
import { sourceNamed } from "@/src/application/use-cases/sources/source-named";
import { QueueFullError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Job,
  jobLogged,
  type NewJobInput,
} from "@/src/entities/models/job.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { postingKey } from "@/src/entities/posting-link";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ICreateJobUseCase = ReturnType<typeof createJobUseCase>;

// A new job (R1, R20): Claude's proposal, which waits in Hector's review queue, or a job Hector
// adds, accepted at once. Who is acting decides, whatever the entry point (KTD3). Either starts in
// verify. A posting already on a job is refused as a duplicate, and so is a proposal once the
// queue holds as many as Hector's cap, both checked under the queue's lock (KTD8). The source is
// found by name, or added.
export const createJobUseCase = (
  jobsRepository: IJobsRepository,
  companiesRepository: ICompaniesRepository,
  leadSourcesRepository: ILeadSourcesRepository,
  settingsRepository: ISettingsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createJob" });

  return async (context: ChangeContext, input: NewJobInput): Promise<Job> => {
    const { ownerId } = context;
    const proposal = context.actor === "agent";
    const today = todayIn(PLAN_TIME_ZONE);
    const key = input.postingUrl ? postingKey(input.postingUrl) : null;

    const job = await transactionManager.startTransaction(async (tx) => {
      await jobsRepository.lockQueue(ownerId, tx);
      if (key) {
        await refuseDuplicate(jobsRepository, ownerId, key, tx);
      }
      if (proposal) {
        const { pendingCap } =
          (await settingsRepository.get(ownerId, tx)) ?? DEFAULT_SETTINGS;
        if ((await jobsRepository.countPending(ownerId, tx)) >= pendingCap) {
          throw new QueueFullError();
        }
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
          nextStep: input.nextStep ?? null,
          nextDate: input.nextDate ?? null,
          appliedOn: null,
          targetRole: input.targetRole ?? null,
          level: input.level ?? null,
          location: input.location ?? null,
          workMode: input.workMode ?? null,
          payMin: input.payMin ?? null,
          payMax: input.payMax ?? null,
          postingUrl: input.postingUrl ?? null,
          postingKey: key,
          summary: input.summary ?? null,
          foundOn: input.foundOn ?? today,
          sourceId: source.id,
          travelPercent: input.travelPercent ?? null,
          employmentType: input.employmentType ?? null,
          teamSize: input.teamSize ?? null,
          status: "verify",
          reviewState: proposal ? "pending" : "accepted",
          proposalReason: proposal ? (input.reason ?? null) : null,
          dismissReason: null,
          dismissNote: null,
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
    logger.info("Job created", { jobId: job.id, review: job.reviewState });
    return job;
  };
};
