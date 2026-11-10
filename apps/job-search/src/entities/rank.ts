import type { JobStatus } from "./job-lifecycle";
import { addDays } from "./week";

// The ranked list of jobs to apply to (R27, docs/build-plan.md KTD23 and KTD24): the open jobs not
// yet applied to, pinned ones first, then Hector's targets, then the rest by a priority worked out
// on every read. Nothing here is stored, so a change to a weight re-sorts the list at once.

// The statuses the list holds: a job leaves it once it's applied to or archived.
export const TO_APPLY_STATUSES = [
  "verify",
  "target",
] as const satisfies readonly JobStatus[];

// A job with no fit score, as one Hector adds himself has, counts as a solid pass.
export const DEFAULT_SCORE = 7;

// A posting older than this leaves the list unless its job is pinned (KTD24).
const EXPIRY_DAYS = 21;

// Why the daily run archives an expired job: skipped's reason, as Not for me's are (KTD24).
export const EXPIRED_REASON = "Not picked in time";

// What the rank reads of a job: its company's tier is the company's, and the rest its own.
export type Rankable = {
  id: string;
  status: JobStatus;
  pinnedAt: Date | null;
  score: number | null;
  tier: number | null;
  postedOn: string | null;
  foundOn: string;
  payMin: number | null;
  payMax: number | null;
};

export function isToApply(status: JobStatus): boolean {
  return (TO_APPLY_STATUSES as readonly JobStatus[]).includes(status);
}

// The posting's date, or the day the job was found when the posting gave none.
function postingDate(job: Pick<Rankable, "postedOn" | "foundOn">): string {
  return job.postedOn ?? job.foundOn;
}

// Whether an untouched job has left the list: unpinned, not yet applied to, and its posting more
// than EXPIRY_DAYS days old in Eastern time. The daily run then archives it (KTD24).
export function isExpired(
  job: Pick<Rankable, "status" | "pinnedAt" | "postedOn" | "foundOn">,
  today: string,
): boolean {
  return (
    isToApply(job.status) &&
    job.pinnedAt === null &&
    postingDate(job) < addDays(today, -EXPIRY_DAYS)
  );
}

// A job's priority: its fit score, plus its company's tier, its posting's freshness and its posted
// pay against Hector's floor (KTD23). Higher comes first.
export function priority(
  job: Pick<
    Rankable,
    "score" | "tier" | "postedOn" | "foundOn" | "payMin" | "payMax"
  >,
  today: string,
  floor: number | null,
): number {
  return (
    (job.score ?? DEFAULT_SCORE) +
    tierPart(job.tier) +
    freshnessPart(postingDate(job), today) +
    payPart(job, floor)
  );
}

function tierPart(tier: number | null): number {
  if (tier === 1) {
    return 2;
  }
  return tier === 2 ? 1 : 0;
}

// 0 to 3 days old adds 1, 4 to 10 days nothing, and older takes 1 away.
function freshnessPart(posted: string, today: string): number {
  if (posted >= addDays(today, -3)) {
    return 1;
  }
  return posted >= addDays(today, -10) ? 0 : -1;
}

// A posted top under the floor takes 2 away, and a posted bottom at or over it adds 1. No band, or
// no floor, adds nothing.
function payPart(
  { payMin, payMax }: Pick<Rankable, "payMin" | "payMax">,
  floor: number | null,
): number {
  if (floor === null) {
    return 0;
  }
  if (payMax !== null && payMax < floor) {
    return -2;
  }
  return payMin !== null && payMin >= floor ? 1 : 0;
}

// Pinned jobs come first, then Hector's targets, then the rest.
function group(job: Rankable): number {
  if (job.pinnedAt) {
    return 0;
  }
  return job.status === "target" ? 1 : 2;
}

// The list in its order, expired jobs left out: pinned jobs, the latest pin first, then targets,
// then the rest, each by priority. Ties go to the newer posting, then the higher posted top, then
// the id, so the order is stable.
export function rankJobs<T extends Rankable>(
  jobs: readonly T[],
  today: string,
  floor: number | null,
): T[] {
  return jobs
    .filter((job) => isToApply(job.status) && !isExpired(job, today))
    .map((job) => ({ job, priority: priority(job, today, floor) }))
    .sort((a, b) => {
      const byGroup = group(a.job) - group(b.job);
      if (byGroup !== 0) {
        return byGroup;
      }
      if (a.job.pinnedAt && b.job.pinnedAt) {
        const byPin = b.job.pinnedAt.getTime() - a.job.pinnedAt.getTime();
        if (byPin !== 0) {
          return byPin;
        }
      }
      return (
        b.priority - a.priority ||
        compareDesc(postingDate(a.job), postingDate(b.job)) ||
        (b.job.payMax ?? -1) - (a.job.payMax ?? -1) ||
        compareAsc(a.job.id, b.job.id)
      );
    })
    .map(({ job }) => job);
}

function compareAsc(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function compareDesc(a: string, b: string): number {
  return compareAsc(b, a);
}
