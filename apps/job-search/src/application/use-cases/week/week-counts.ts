import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import {
  SCREEN_OR_BEYOND,
  type WeeklyCounts,
  weekRange,
} from "@/src/entities/weekly-counts";

// A week's counts (R10, docs/build-plan.md KTD9), each from its repository's query over the days
// things happened, Monday to Sunday: This week's and the week page's live counts, and a review's
// snapshot.
export async function weekCounts(
  repositories: {
    jobs: IJobsRepository;
    interactions: IInteractionsRepository;
    practice: IPracticeRepository;
  },
  ownerId: string,
  monday: string,
): Promise<WeeklyCounts> {
  const { from, to } = weekRange(monday);
  const [interactions, applications, practiceSessions, screensReached] =
    await Promise.all([
      repositories.interactions.countInRange(ownerId, from, to),
      repositories.jobs.countApplied(ownerId, from, to),
      repositories.practice.countSessions(ownerId, from, to),
      repositories.jobs.countMovesInto(ownerId, SCREEN_OR_BEYOND, from, to),
    ]);
  return { ...interactions, applications, practiceSessions, screensReached };
}
