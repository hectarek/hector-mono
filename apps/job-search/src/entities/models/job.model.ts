import { z } from "zod";
import {
  CLOSED_STATUSES,
  type JobStatus,
  OPEN_STATUSES,
} from "../job-lifecycle";
import type { ActivityEntry } from "./activity.model";
import type { CompanyRef } from "./company.model";
import {
  dateSchema,
  httpLink,
  optionalText,
  requiredText,
  timeSchema,
} from "./input.model";
import type { LoggedStatusChange } from "./job-status-change.model";
import type { LeadSource } from "./lead-source.model";
import type { Note } from "./note.model";
import type { PersonRef } from "./person.model";

// A job's level, from the most junior up: ordered, so the profile's range can compare (KTD13).
export const LEVELS = [
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "contract-to-hire",
] as const;

// Where a job stands in Hector's review (KTD8): Claude's proposals wait as pending until he
// accepts or dismisses them; the jobs he adds are accepted from the start.
export const REVIEW_STATES = ["pending", "accepted", "dismissed"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

// Why Hector dismissed a proposal (KTD8).
export const DISMISS_REASONS = [
  "not-hiring",
  "wrong-level",
  "wrong-location-or-mode",
  "pay-too-low",
  "company-too-small",
  "other",
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

type Level = (typeof LEVELS)[number];
type WorkMode = (typeof WORK_MODES)[number];
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

// What a job holds that a change can set (R1), naming its company and lead source (R5) by id.
// Dates are "YYYY-MM-DD" (KTD18); pay is a posted yearly band in US dollars.
export type JobFacts = {
  companyId: string;
  // For a role through an agency: the agency is the company, the employer of record, and this
  // is its client.
  clientName: string | null;
  role: string;
  nextStep: string | null;
  nextDate: string | null;
  appliedOn: string | null;
  targetRole: string | null;
  level: Level | null;
  location: string | null;
  workMode: WorkMode | null;
  payMin: number | null;
  payMax: number | null;
  postingUrl: string | null;
  // Claude's summary of the posting, never the posting itself: outside text, kept short (KTD21).
  summary: string | null;
  foundOn: string;
  sourceId: string;
  travelPercent: number | null;
  employmentType: EmploymentType | null;
  teamSize: number | null;
};

// Where a job stands: its status (job-lifecycle.ts) and Hector's review (KTD8). Claude's reason
// comes with its proposal; a dismissal's reason and note with Hector's call.
export type JobState = {
  status: JobStatus;
  reviewState: ReviewState;
  proposalReason: string | null;
  dismissReason: DismissReason | null;
  dismissNote: string | null;
};

// A job as it's read: its company and lead source by name too.
export type Job = Omit<JobFacts, "companyId" | "sourceId"> &
  JobState & {
    id: string;
    company: CompanyRef & { tier: number | null };
    source: LeadSource;
    // When it last changed: a change sends back the one it read (R22).
    updatedAt: Date;
  };

// A job as its page and get_job show it (U6, U7): the job, its notes and status moves, the latest
// first, its latest changes, its contacts, and the latest reply linked to it, which the stale rule
// reads (R3). Interview rounds come with U12 and fit with U15.
export type JobDetail = {
  job: Job;
  notes: Note[];
  moves: LoggedStatusChange[];
  activity: ActivityEntry[];
  contacts: PersonRef[];
  repliedOn: string | null;
};

// A job as a list shows it.
export type JobSummary = Pick<
  Job,
  | "id"
  | "role"
  | "company"
  | "status"
  | "nextStep"
  | "nextDate"
  | "appliedOn"
  | "location"
  | "workMode"
  | "reviewState"
  | "dismissReason"
>;

export function jobSummary(job: Job): JobSummary {
  return {
    id: job.id,
    role: job.role,
    company: job.company,
    status: job.status,
    nextStep: job.nextStep,
    nextDate: job.nextDate,
    appliedOn: job.appliedOn,
    location: job.location,
    workMode: job.workMode,
    reviewState: job.reviewState,
    dismissReason: job.dismissReason,
  };
}

// A job that's gone, as its delete answers: which one, and the company whose page listed it.
export type DeletedJob = { id: string; role: string; companyId: string };

// Another job, as a duplicate names it (R20): which job holds the posting, and where it stands.
export type DuplicateJob = Pick<
  Job,
  "id" | "role" | "reviewState" | "dismissReason"
> & { company: string };

// A job as its history records it: the company and source by name.
export function jobLogged(job: Job): Record<string, unknown> {
  const { id, company, source, updatedAt, ...rest } = job;
  return { company: company.name, source: source.name, ...rest };
}

const levelSchema = z.enum(LEVELS, {
  error: `Use one of: ${LEVELS.join(", ")}`,
});
const workModeSchema = z.enum(WORK_MODES, {
  error: `Use one of: ${WORK_MODES.join(", ")}`,
});
const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES, {
  error: `Use one of: ${EMPLOYMENT_TYPES.join(", ")}`,
});
const paySchema = z
  .int({ error: "Use whole dollars a year" })
  .min(0, { error: "At least 0" })
  .max(10_000_000, { error: "At most 10,000,000" });
// A source by name: the one listed under it in any case, or a new one (R5).
const sourceNameSchema = requiredText(80, "A job needs its lead source");

// The details any job may carry, every one optional.
const jobDetailsSchema = z.object({
  clientName: optionalText(120).optional(),
  nextStep: optionalText(120).optional(),
  nextDate: dateSchema.nullable().optional(),
  targetRole: optionalText(80).optional(),
  level: levelSchema.nullable().optional(),
  location: optionalText(120).optional(),
  workMode: workModeSchema.nullable().optional(),
  payMin: paySchema.nullable().optional(),
  payMax: paySchema.nullable().optional(),
  summary: optionalText(2000).optional(),
  foundOn: dateSchema.optional(),
  travelPercent: z
    .int({ error: "Use a whole percentage" })
    .min(0, { error: "At least 0" })
    .max(100, { error: "At most 100" })
    .nullable()
    .optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
  teamSize: z
    .int({ error: "Use a whole number of people" })
    .min(1, { error: "At least 1" })
    .max(100_000, { error: "At most 100,000" })
    .nullable()
    .optional(),
});

// A posted band's top is at least its bottom.
function bandInOrder(
  { payMin, payMax }: { payMin?: number | null; payMax?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (payMin != null && payMax != null && payMax < payMin) {
    ctx.addIssue({
      code: "custom",
      path: ["payMax"],
      message: "The top of the band is below its bottom",
    });
  }
}

// propose_job's input (R20): Claude's find, with the posting's link, its source and Claude's reason.
// It waits in Hector's review queue.
export const proposeJobSchema = jobDetailsSchema
  .extend({
    companyId: z.uuid(),
    role: requiredText(120, "A job needs its role"),
    postingUrl: httpLink(2000),
    source: sourceNameSchema,
    reason: requiredText(500, "Say why it's worth Hector's look"),
  })
  .superRefine(bandInOrder);

// The add-job form's input: a job Hector adds, the posting's link optional. It's accepted at once.
export const addJobSchema = jobDetailsSchema
  .extend({
    companyId: z.uuid(),
    role: requiredText(120, "A job needs its role"),
    postingUrl: httpLink(2000).nullable().optional(),
    source: sourceNameSchema,
  })
  .superRefine(bandInOrder);

// A new job, as either input reads.
export type NewJobInput = z.output<typeof addJobSchema> & { reason?: string };

// update_job's input: a change to the facts given, against the updatedAt read with the job (R22).
// Null clears a fact. A status moves only with set_job_status or close_job, the review only with
// Hector's call, and applied-on, for Claude, only with a dated status move (KTD3).
export const updateJobSchema = jobDetailsSchema
  .extend({
    id: z.uuid(),
    updatedAt: timeSchema,
    companyId: z.uuid().optional(),
    role: requiredText(120, "A job needs its role").optional(),
    postingUrl: httpLink(2000).nullable().optional(),
    source: sourceNameSchema.optional(),
    appliedOn: dateSchema.nullable().optional(),
  })
  .superRefine(bandInOrder);
export type UpdateJobInput = z.output<typeof updateJobSchema>;

// set_job_status' input: an open status, on a date (today by default). Closing takes close_job.
export const setJobStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(OPEN_STATUSES, {
    error: `Use one of: ${OPEN_STATUSES.join(", ")}. A closed status goes through close_job, with a reason`,
  }),
  on: dateSchema.optional(),
});

// close_job's input (KTD5): a closed status, on a date (today by default), and why.
export const closeJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(CLOSED_STATUSES, {
    error: `Use one of: ${CLOSED_STATUSES.join(", ")}`,
  }),
  on: dateSchema.optional(),
  reason: requiredText(200, "Say why it's closing"),
});

// A status move, as either input reads.
export type StatusMoveInput = {
  id: string;
  status: JobStatus;
  on?: string;
  reason?: string;
};

// Dismissing a proposal: one of the reasons, and a note if Hector adds one.
export const dismissProposalSchema = z.object({
  id: z.uuid(),
  reason: z.enum(DISMISS_REASONS, {
    error: `Use one of: ${DISMISS_REASONS.join(", ")}`,
  }),
  note: optionalText(200).optional(),
});

// Which job: get_job's input, and accepting, reopening and deleting one's.
export const jobIdSchema = z.object({ id: z.uuid() });

// What Hector decides about a proposal (R20).
export type ProposalDecision =
  | { id: string; decision: "accept" }
  | { id: string; decision: "reopen" }
  | {
      id: string;
      decision: "dismiss";
      reason: DismissReason;
      note: string | null;
    };

// The most jobs a page of find_jobs holds.
export const JOB_PAGE_MAX = 50;

// find_jobs' input: the owner's jobs, accepted ones unless asked otherwise (KTD8), narrowed to
// open or closed ones or one status, and to one company, by next date, a page at a time.
export const findJobsSchema = z.object({
  status: z
    .enum(["open", "closed", ...OPEN_STATUSES, ...CLOSED_STATUSES], {
      error: "Use open, closed or a status",
    })
    .optional(),
  reviewState: z
    .enum(REVIEW_STATES, { error: `Use one of: ${REVIEW_STATES.join(", ")}` })
    .default("accepted"),
  companyId: z.uuid().optional(),
  limit: z.int().min(1).max(JOB_PAGE_MAX).default(20),
  offset: z.int().min(0).default(0),
});
export type JobQuery = z.output<typeof findJobsSchema>;

// The statuses a find_jobs filter names: a group, or one; null for every status.
export function statusesFor(
  status: JobQuery["status"],
): readonly JobStatus[] | null {
  if (status === undefined) {
    return null;
  }
  if (status === "open") {
    return OPEN_STATUSES;
  }
  return status === "closed" ? CLOSED_STATUSES : [status];
}

// nextOffset: where the next page starts, or null on the last one.
export type JobPage = { jobs: JobSummary[]; nextOffset: number | null };
