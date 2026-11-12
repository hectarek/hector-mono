import type { ClosedStatus, JobStatus } from "@/src/entities/job-lifecycle";
import type { ChangeActor } from "@/src/entities/models/activity.model";
import type { BlockState, Effort } from "@/src/entities/models/block.model";
import type {
  ConversationState,
  InteractionKind,
} from "@/src/entities/models/interaction.model";
import type { JobFacts } from "@/src/entities/models/job.model";
import type { PracticeResult } from "@/src/entities/practice-ladder";
import { EXPIRED_REASON } from "@/src/entities/rank";

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

// An interaction's values (KTD9), which the person page and the quick-log sheet show.
export const INTERACTION_LABELS: Record<InteractionKind, string> = {
  "message-sent": "Message sent",
  "reply-received": "Reply",
  conversation: "Conversation",
};

export const CONVERSATION_LABELS: Record<ConversationState, string> = {
  scheduled: "Scheduled",
  held: "Held",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

// How a practice try went (R11), which the practice pages and forms show.
export const PRACTICE_RESULT_LABELS: Record<PracticeResult, string> = {
  solved: "Solved",
  partial: "Partial",
  failed: "Failed",
};

// The reasons a close offers as one tap, by the status it closes as (the UX plan's UX9). Any
// other is typed. Skipped's are Not for me's too, with the old review queue's dismiss reasons and
// the daily run's (R20 as revised 2026-11-10, KTD24).
export const CLOSE_REASONS: Record<ClosedStatus, readonly string[]> = {
  rejected: ["After applying", "After the screen", "After the onsite"],
  closed: ["Posting closed", "Role filled"],
  stale: ["No reply after 21 days"],
  skipped: [
    "Not a fit",
    "Not hiring",
    "Wrong level",
    "Wrong location or mode",
    "Pay too low",
    "Company too small",
    "Applied there already",
    EXPIRED_REASON,
  ],
  withdrawn: ["Lost interest", "Chose another role"],
  "offer-accepted": ["Accepted the offer"],
  "offer-declined": ["Declined the offer"],
};

// What a Focus block feeds, and how it went (R26, U17).
export const EFFORT_LABELS: Record<Effort, string> = {
  networking: "Networking",
  applying: "Applying",
  practice: "Practice",
  projects: "Projects",
  upkeep: "Upkeep",
};

export const BLOCK_STATE_LABELS: Record<BlockState, string> = {
  planned: "Planned",
  done: "Done",
  partial: "Partial",
  moved: "Moved",
  skipped: "Skipped",
};
