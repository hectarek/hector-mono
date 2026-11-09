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

const STALE_DAYS = 21;

export function isClosed(status: JobStatus): status is ClosedStatus {
  return (CLOSED_STATUSES as readonly JobStatus[]).includes(status);
}

// What comes next at each open stage but applied, and how many days after the move it's due (R3
// as revised 2026-11-07, the UX plan's UX9): a move replaces the step the job had, which was about
// the stage it left.
const STEP_AT: Record<
  Exclude<OpenStatus, "applied">,
  { step: string; days: number }
> = {
  verify: { step: "Verify it's hiring", days: 0 },
  target: { step: "Apply", days: 2 },
  screen: { step: "Prepare for the screen", days: 2 },
  onsite: { step: "Prepare for the onsite", days: 3 },
  offer: { step: "Decide on the offer", days: 3 },
};

// The next step and date a move to an open status, made on `on`, sets (R3): at applied, none, since
// a follow-up is set only when Hector agrees to one (revised 2026-11-09, his call) and the stale
// check still lists the job at 21 days; at any other stage, that stage's step.
export function stepAfterMove(
  to: OpenStatus,
  on: string,
): Pick<JobStage, "nextStep" | "nextDate"> {
  if (to === "applied") {
    return { nextStep: null, nextDate: null };
  }
  const { step, days } = STEP_AT[to];
  return { nextStep: step, nextDate: addDays(on, days) };
}

// What a move to `to`, made on `on`, leaves the job at (R3): the first move to applied or beyond
// fills an empty applied-on with the move's date; a move to an open status sets that stage's next
// step (stepAfterMove); a move to a closed status clears the next step and date (the move's reason
// goes in its log).
export function afterMove(job: JobStage, to: JobStatus, on: string): JobStage {
  const appliedOn =
    job.appliedOn ?? (APPLIED_OR_BEYOND.includes(to) ? on : null);
  if (isClosed(to)) {
    return { status: to, appliedOn, nextStep: null, nextDate: null };
  }
  return { status: to, appliedOn, ...stepAfterMove(to, on) };
}

// An accepted proposal (R20): in verify, with checking it's still hiring due the day it's accepted.
export function acceptedStage(
  today: string,
): Pick<JobStage, "status" | "nextStep" | "nextDate"> {
  return { status: "verify", ...stepAfterMove("verify", today) };
}

// The latest applied-on a job can have and be a stale candidate on the day given (R3).
export function staleAppliedBy(today: string): string {
  return addDays(today, -STALE_DAYS);
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
