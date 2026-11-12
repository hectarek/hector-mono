import { z } from "zod";
import {
  CLOSED_STATUSES,
  type JobStatus,
  OPEN_STATUSES,
} from "../job-lifecycle";
import { TO_APPLY_STATUSES } from "../rank";
import type { ActivityEntry, RecordAdded } from "./activity.model";
import type { CompanyRef } from "./company.model";
import {
  dateSchema,
  httpLink,
  optionalText,
  requiredText,
  timeSchema,
} from "./input.model";
import type { Interaction } from "./interaction.model";
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
  // The posting's own date, which the ranked list's freshness and expiry read (KTD23, KTD24).
  postedOn: string | null;
  // Claude's summary of the posting, never the posting itself: outside text, kept short (KTD21).
  summary: string | null;
  // Why Claude added it, when Claude did (R20 as revised), and the sweep's fit score, 1 to 10.
  reason: string | null;
  score: number | null;
  foundOn: string;
  sourceId: string;
  travelPercent: number | null;
  employmentType: EmploymentType | null;
  teamSize: number | null;
};

// Where a job stands: its status (job-lifecycle.ts), and when it was pinned to the top of the
// ranked list (R27), or null.
export type JobState = {
  status: JobStatus;
  pinnedAt: Date | null;
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
  // Who added it and when (the UX plan's UX8).
  added: RecordAdded;
  // The interactions linked to it, the latest first, each with its person (UX8).
  outreach: JobOutreach[];
};

// One interaction linked to a job, with the person it was with.
export type JobOutreach = { interaction: Interaction; person: PersonRef };

// A job as a list shows it, with the updatedAt a change from the list sends back (R22). The ranked
// list's rows show its pay, score, posting date (or the day it was found), reason and pin too
// (R27).
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
  | "payMin"
  | "payMax"
  | "postedOn"
  | "foundOn"
  | "score"
  | "reason"
  | "pinnedAt"
  | "updatedAt"
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
    payMin: job.payMin,
    payMax: job.payMax,
    postedOn: job.postedOn,
    foundOn: job.foundOn,
    score: job.score,
    reason: job.reason,
    pinnedAt: job.pinnedAt,
    updatedAt: job.updatedAt,
  };
}

// A job that's gone, as its delete answers: which one, and the company whose page listed it.
export type DeletedJob = { id: string; role: string; companyId: string };

// Another job, as a duplicate names it (R20): which job holds the posting, and its status, which
// says when it's archived.
export type DuplicateJob = Pick<Job, "id" | "role" | "status"> & {
  company: string;
};

// A job as its history records it: the company and source by name, and whether it's pinned, as
// pin_job logs it.
export function jobLogged(job: Job): Record<string, unknown> {
  const { id, company, source, updatedAt, pinnedAt, ...rest } = job;
  return {
    company: company.name,
    source: source.name,
    ...rest,
    pinned: pinnedAt !== null,
  };
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
  postedOn: dateSchema.nullable().optional(),
  reason: optionalText(500).optional(),
  score: z
    .int({ error: "Use a whole number from 1 to 10" })
    .min(1, { error: "At least 1" })
    .max(10, { error: "At most 10" })
    .nullable()
    .optional(),
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

// add_job's input and the add-job form's (R20 as revised 2026-11-10): a job for the ranked list,
// Hector's or Claude's. Claude's also needs the posting's link and a reason, which the use case
// checks, since only who is acting tells them apart (KTD3).
export const addJobSchema = jobDetailsSchema
  .extend({
    companyId: z.uuid(),
    role: requiredText(120, "A job needs its role"),
    postingUrl: httpLink(2000).nullable().optional(),
    source: sourceNameSchema,
  })
  .superRefine(bandInOrder);
export type NewJobInput = z.output<typeof addJobSchema>;

// update_job's input: a change to the facts given, against the updatedAt read with the job (R22).
// Null clears a fact. A status moves only with set_job_status or close_job, and applied-on, for
// Claude, only with a dated status move (KTD3).
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

// set_job_status' input: an open status, on a date (today by default). Archiving takes close_job.
export const setJobStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(OPEN_STATUSES, {
    error: `Use one of: ${OPEN_STATUSES.join(", ")}. The statuses that archive a job go through close_job, with a reason`,
  }),
  on: dateSchema.optional(),
  // What comes next, in place of the step the move sets for the new stage (R3 as revised
  // 2026-11-07, the UX plan's UX9). A step given no date is due a week out.
  nextStep: optionalText(120).optional(),
  nextDate: dateSchema.nullable().optional(),
});

// close_job's input (KTD5): a status that archives the job, on a date (today by default), and why.
export const closeJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(CLOSED_STATUSES, {
    error: `Use one of: ${CLOSED_STATUSES.join(", ")}`,
  }),
  on: dateSchema.optional(),
  reason: requiredText(200, "Say why it's archived"),
});

// A status move, as either input reads, or the daily expiry run makes it against the updatedAt it
// read (KTD24).
export type StatusMoveInput = {
  id: string;
  status: JobStatus;
  on?: string;
  reason?: string;
  nextStep?: string | null;
  nextDate?: string | null;
  updatedAt?: Date;
};

// Which job: get_job's input, and deleting one's.
export const jobIdSchema = z.object({ id: z.uuid() });

// pin_job's input (R27): pin a job not yet applied to at the top of the ranked list, or unpin it.
export const pinJobSchema = z.object({
  id: z.uuid(),
  pinned: z.boolean({ error: "Say true to pin, or false to unpin" }),
});
export type PinJobInput = z.output<typeof pinJobSchema>;

// The most jobs a page of find_jobs holds.
export const JOB_PAGE_MAX = 50;

// find_jobs' input: the owner's jobs, narrowed to open or archived ones (every ended status, the
// UX plan's Q6, so closed is the one status) or one status, to one company, and to those whose next
// step has no date, by next date, a page at a time. `to-apply` is the ranked list instead (R27),
// in the rank's order.
export const findJobsSchema = z.object({
  status: z
    .enum(
      ["open", "archived", "to-apply", ...OPEN_STATUSES, ...CLOSED_STATUSES],
      { error: "Use open, archived, to-apply or a status" },
    )
    .optional(),
  companyId: z.uuid().optional(),
  // Only jobs whose next step has no date (the UX plan's UX6).
  undated: z.boolean().optional(),
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
  if (status === "to-apply") {
    return TO_APPLY_STATUSES;
  }
  return status === "archived" ? CLOSED_STATUSES : [status];
}

// nextOffset: where the next page starts, or null on the last one.
export type JobPage = { jobs: JobSummary[]; nextOffset: number | null };
