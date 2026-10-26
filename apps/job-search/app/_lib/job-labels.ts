import type { JobStatus } from "@/src/entities/job-lifecycle";
import type { ChangeActor } from "@/src/entities/models/activity.model";
import type {
  DismissReason,
  JobFacts,
  ReviewState,
} from "@/src/entities/models/job.model";

// A job's values as the screens name them.

export const STATUS_LABELS: Record<JobStatus, string> = {
  verify: "Verify",
  target: "Target",
  applied: "Applied",
  screen: "Screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  closed: "Closed",
  stale: "Stale",
  skipped: "Skipped",
  withdrawn: "Withdrawn",
  "offer-accepted": "Offer accepted",
  "offer-declined": "Offer declined",
};

export const REVIEW_LABELS: Record<ReviewState, string> = {
  pending: "To review",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

export const DISMISS_LABELS: Record<DismissReason, string> = {
  "not-hiring": "Not hiring",
  "wrong-level": "Wrong level",
  "wrong-location-or-mode": "Wrong location or mode",
  "pay-too-low": "Pay too low",
  "company-too-small": "Company too small",
  other: "Other",
};

export const LEVEL_LABELS: Record<NonNullable<JobFacts["level"]>, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export const WORK_MODE_LABELS: Record<
  NonNullable<JobFacts["workMode"]>,
  string
> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

export const EMPLOYMENT_LABELS: Record<
  NonNullable<JobFacts["employmentType"]>,
  string
> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  "contract-to-hire": "Contract to hire",
};

// Who wrote or changed something, by name.
export const ACTOR_LABELS: Record<ChangeActor, string> = {
  owner: "Hector",
  agent: "Claude",
  import: "Import",
  system: "The app",
};
