import { addDays } from "./week";

// A job's statuses (R2): open ones, in the order a job usually moves through them, and closed
// ones. Any move is allowed, and each records the date it happened.
export const OPEN_STATUSES = [
  "verify",
  "target",
  "applied",
  "screen",
  "onsite",
  "offer",
] as const;
export const CLOSED_STATUSES = [
  "rejected",
  "closed",
  "stale",
  "skipped",
  "withdrawn",
  "offer-accepted",
  "offer-declined",
] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];
export type ClosedStatus = (typeof CLOSED_STATUSES)[number];
export type JobStatus = OpenStatus | ClosedStatus;

// Where a job stands, as a move changes it. Dates are "YYYY-MM-DD", Eastern (KTD18).
export type JobStage = {
  status: JobStatus;
  appliedOn: string | null;
  nextStep: string | null;
  nextDate: string | null;
};

// The statuses that mean an application went in: applied, the stages after it, and an offer's
// outcome. A closed status such as rejected doesn't say whether one did.
const APPLIED_OR_BEYOND: readonly JobStatus[] = [
  "applied",
  "screen",
  "onsite",
  "offer",
  "offer-accepted",
  "offer-declined",
];

const FOLLOW_UP_DAYS = 7;
const SECOND_FOLLOW_UP_DAYS = 14;
const STALE_DAYS = 21;

export function isClosed(status: JobStatus): status is ClosedStatus {
  return (CLOSED_STATUSES as readonly JobStatus[]).includes(status);
}

// What a move to `to`, made on `on`, leaves the job at (R3): the first move to applied or beyond
// fills an empty applied-on with the move's date; a move to applied sets "Follow up" due 7 days
// after applied-on; a move to a closed status clears the next step and date (the move's reason
// goes in its log). Anything else stays as it was.
export function afterMove(job: JobStage, to: JobStatus, on: string): JobStage {
  const appliedOn =
    job.appliedOn ?? (APPLIED_OR_BEYOND.includes(to) ? on : null);
  if (isClosed(to)) {
    return { status: to, appliedOn, nextStep: null, nextDate: null };
  }
  if (to === "applied" && appliedOn) {
    return {
      status: to,
      appliedOn,
      nextStep: "Follow up",
      nextDate: addDays(appliedOn, FOLLOW_UP_DAYS),
    };
  }
  return {
    status: to,
    appliedOn,
    nextStep: job.nextStep,
    nextDate: job.nextDate,
  };
}

// An accepted proposal (R20): in verify, with checking it's still hiring due the day it's accepted.
export function acceptedStage(
  today: string,
): Pick<JobStage, "status" | "nextStep" | "nextDate"> {
  return { status: "verify", nextStep: "Verify it's hiring", nextDate: today };
}

// What a follow-up message linked to the job leaves it at (R3): a job at applied has its next date
// moved to 14 days after applied-on. Any other job stays as it was.
export function afterFollowUp(job: JobStage): JobStage {
  if (job.status !== "applied" || !job.appliedOn) {
    return job;
  }
  return { ...job, nextDate: addDays(job.appliedOn, SECOND_FOLLOW_UP_DAYS) };
}

// A job still at applied 21 days after applied-on with no reply linked to it, for Hector or Claude
// to mark stale (R3). `repliedOn` is the latest reply linked to the job, if any: a reply, like any
// move past applied, means it isn't stale.
export function isStaleCandidate(
  {
    status,
    appliedOn,
    repliedOn,
  }: Pick<JobStage, "status" | "appliedOn"> & { repliedOn: string | null },
  today: string,
): boolean {
  return (
    status === "applied" &&
    appliedOn !== null &&
    repliedOn === null &&
    addDays(appliedOn, STALE_DAYS) <= today
  );
}
