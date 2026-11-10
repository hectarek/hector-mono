import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { Job } from "@/src/entities/models/job.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { rankJobs } from "@/src/entities/rank";

// The ranked list (R27): the owner's jobs not yet applied to, the expired left out, in the rank's
// order, weighed against Hector's pay floor (KTD23, KTD24). find_jobs' `to-apply` and This week's
// apply next read it.
export async function rankedList(
  jobsRepository: IJobsRepository,
  settingsRepository: ISettingsRepository,
  ownerId: string,
  today: string,
): Promise<Job[]> {
  const [candidates, settings] = await Promise.all([
    jobsRepository.listToApply(ownerId),
    settingsRepository.get(ownerId),
  ]);
  return rankJobs(
    candidates.map((job) => ({ ...job, tier: job.company.tier })),
    today,
    (settings ?? DEFAULT_SETTINGS).payFloor,
  );
}
