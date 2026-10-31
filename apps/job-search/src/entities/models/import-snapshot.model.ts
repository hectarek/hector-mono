import { z } from "zod";
import {
  CLOSED_STATUSES,
  type JobStatus,
  OPEN_STATUSES,
} from "../job-lifecycle";
import { PRACTICE_RESULTS } from "../practice-ladder";
import {
  dateSchema,
  httpLink,
  optionalText,
  requiredText,
} from "./input.model";
import { RANKS } from "./person.model";

// The sheet, as Claude turns its export into a snapshot and Hector reviews it (docs/build-plan.md
// KTD14, U11). The snapshot lives in Hector's private docs, never in the repo. Every record carries
// the ref the snapshot knows it by; the import keeps it, by kind, in import_refs, so a rerun skips
// what already landed. Each record is read on its own, so a bad one is reported and the rest
// import.

const refSchema = z.string().trim().min(1).max(120);

// What the whole snapshot holds: the day the sheet was frozen, and its records, each read later.
export const importSnapshotSchema = z.object({
  takenOn: dateSchema,
  companies: z.array(z.unknown()).default([]),
  jobs: z.array(z.unknown()).default([]),
  people: z.array(z.unknown()).default([]),
  practice: z.array(z.unknown()).default([]),
});

export const snapshotCompanySchema = z.object({
  ref: refSchema,
  name: requiredText(120, "A company needs a name"),
  website: httpLink(300).nullable().optional(),
  location: optionalText(120).optional(),
  tier: z.int().min(1).max(3).nullable().optional(),
});

// A job as the sheet has it: its status, and the day it reached that status, which Claude proposes
// and Hector confirms. The source is its name, "unknown" where the posting doesn't make it clear.
export const snapshotJobSchema = z.object({
  ref: refSchema,
  companyRef: refSchema,
  role: requiredText(120, "A job needs its role"),
  status: z.enum([...OPEN_STATUSES, ...CLOSED_STATUSES]),
  statusOn: dateSchema.nullable().optional(),
  appliedOn: dateSchema.nullable().optional(),
  nextStep: optionalText(120).optional(),
  nextDate: dateSchema.nullable().optional(),
  postingUrl: httpLink(2000).nullable().optional(),
  source: requiredText(80, "Name the job's source, or unknown"),
  foundOn: dateSchema.optional(),
  location: optionalText(120).optional(),
});
export type SnapshotJob = z.output<typeof snapshotJobSchema>;

// A contact as a person, linked to the jobs they're a contact for. Each date filled in becomes one
// dated interaction (KTD9): messaged-on a sent message, replied-on a reply, met-on a held
// conversation.
export const snapshotPersonSchema = z.object({
  ref: refSchema,
  name: requiredText(120, "A person needs a name"),
  companyRef: refSchema.optional(),
  role: optionalText(120).optional(),
  howKnown: optionalText(200).optional(),
  rank: z.enum(RANKS).nullable().optional(),
  ask: optionalText(300).optional(),
  nextStep: optionalText(120).optional(),
  nextDate: dateSchema.nullable().optional(),
  notes: optionalText(2000).optional(),
  jobRefs: z.array(refSchema).default([]),
  messagedOn: dateSchema.nullable().optional(),
  repliedOn: dateSchema.nullable().optional(),
  metOn: dateSchema.nullable().optional(),
});
export type SnapshotPerson = z.output<typeof snapshotPersonSchema>;

const snapshotTrySchema = z.object({
  practicedOn: dateSchema,
  result: z.enum(PRACTICE_RESULTS),
  aiUsed: z.boolean().default(false),
  minutes: z.int().min(1).max(600).nullable().optional(),
  notes: optionalText(2000).optional(),
});

// A practice session with R11's fields, and its reviews in the order they happened.
export const snapshotPracticeSchema = snapshotTrySchema.extend({
  ref: refSchema,
  topic: requiredText(200, "Name the problem or topic"),
  type: optionalText(60).optional(),
  pattern: optionalText(60).optional(),
  reviews: z
    .array(snapshotTrySchema.extend({ ref: refSchema }))
    .max(3)
    .default([]),
});

// The statuses a job reaches only after applying, or by closing: each needs the day it was reached,
// or the week's counts would put the move in the import's week.
const NEEDS_STATUS_DATE: readonly JobStatus[] = [
  "screen",
  "onsite",
  "offer",
  ...CLOSED_STATUSES,
];

export function needsStatusDate(job: SnapshotJob): boolean {
  return NEEDS_STATUS_DATE.includes(job.status) && !job.statusOn;
}

export const IMPORT_KINDS = ["company", "job", "person", "practice"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

// What a run did, or would do: the refs created and the refs already imported, by kind; the
// records that couldn't be read or placed, which the rest import without; and the jobs that need
// a status date, which stop a commit before it writes anything.
export type ImportReport = {
  commit: boolean;
  created: Record<ImportKind, string[]>;
  skipped: Record<ImportKind, string[]>;
  problems: { kind: ImportKind; ref: string | null; reason: string }[];
  undated: string[];
  refused: string | null;
};
