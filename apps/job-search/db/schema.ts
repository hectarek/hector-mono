import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  CLOSED_STATUSES,
  type JobStatus,
  OPEN_STATUSES,
} from "@/src/entities/job-lifecycle";
import type {
  ActivityAction,
  ChangeActor,
  FieldChange,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  CONVERSATION_STATES,
  type ConversationState,
  INTERACTION_KINDS,
  type InteractionKind,
} from "@/src/entities/models/interaction.model";
import {
  DISMISS_REASONS,
  type DismissReason,
  EMPLOYMENT_TYPES,
  type JobFacts,
  LEVELS,
  REVIEW_STATES,
  type ReviewState,
  WORK_MODES,
} from "@/src/entities/models/job.model";
import { RANKS, type Rank } from "@/src/entities/models/person.model";
import {
  PRACTICE_KINDS,
  type PracticeKind,
} from "@/src/entities/models/practice-entry.model";
import type { Settings } from "@/src/entities/models/settings.model";
import {
  PRACTICE_RESULTS,
  type PracticeResult,
} from "@/src/entities/practice-ladder";
import type { WeeklyCounts } from "@/src/entities/weekly-counts";

// The app's tables, added by the units that need them (docs/build-plan.md). Every root table
// carries owner_id (KTD2).

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// A date with no time, "YYYY-MM-DD" in Eastern time (docs/build-plan.md KTD18), read as text.
const day = (name: string) => date(name, { mode: "string" });

// A check that a column holds one of a fixed set of values.
const oneOf = (column: unknown, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(", "))})`;

// When a row last changed, which a change sends back to show what it read (R22, KTD15). Kept to
// the millisecond, a JS Date's precision, and each update moves it on at least a millisecond, so
// a change made since always shows.
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`date_trunc('milliseconds', now())`);

// Every change to a record, and every refused attempt at one (docs/build-plan.md KTD3, KTD7).
// Append-only: a row is written in the change's own transaction and never updated or deleted.
export const activity = pgTable(
  "activity",
  {
    // Also the order rows were written in, which breaks ties between changes made at once.
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    ownerId: uuid("owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actor: text("actor").$type<ChangeActor>().notNull(),
    // The page tool's name when one made the call: only a label from the page.
    tool: text("tool"),
    recordKind: text("record_kind").$type<RecordRef["kind"]>().notNull(),
    recordId: uuid("record_id").notNull(),
    action: text("action").$type<ActivityAction>().notNull(),
    changes: jsonb("changes").$type<FieldChange[]>().notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("activity_owner_id_created_at_idx").on(
      table.ownerId,
      table.createdAt,
    ),
    // A record's history.
    index("activity_owner_id_record_idx").on(
      table.ownerId,
      table.recordKind,
      table.recordId,
      table.createdAt,
    ),
  ],
);

// Companies (R4, U5). name_key is the name as companies compare (companyNameKey: case and
// punctuation dropped), for the soft duplicate warning and find_companies.
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    website: text("website"),
    location: text("location"),
    headcount: integer("headcount"),
    industry: text("industry"),
    officePolicy: text("office_policy"),
    leavePolicy: text("leave_policy"),
    tier: integer("tier"),
    researchSummary: text("research_summary"),
    researchRef: text("research_ref"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("companies_owner_id_name_key_idx").on(table.ownerId, table.nameKey),
    check("companies_tier_check", sql`${table.tier} between 1 and 3`),
    check("companies_headcount_check", sql`${table.headcount} > 0`),
  ],
);

// Where jobs come from (R5, U5). name_key is the name as sources compare (sourceNameKey: case
// ignored), and an owner lists each once.
export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("lead_sources_owner_id_name_key_idx").on(
      table.ownerId,
      table.nameKey,
    ),
  ],
);

// Hector's settings (R12, U5), one row per owner once he first saves them: a weekly target for
// each count (null where none is set) and the cap on pending proposals (KTD8).
export const settings = pgTable(
  "settings",
  {
    ownerId: uuid("owner_id").primaryKey(),
    messagesSentTarget: integer("messages_sent_target"),
    conversationsHeldTarget: integer("conversations_held_target"),
    applicationsTarget: integer("applications_target"),
    practiceSessionsTarget: integer("practice_sessions_target"),
    screensReachedTarget: integer("screens_reached_target"),
    pendingCap: integer("pending_cap").notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "settings_targets_check",
      sql`${table.messagesSentTarget} >= 0 and ${table.conversationsHeldTarget} >= 0 and ${table.applicationsTarget} >= 0 and ${table.practiceSessionsTarget} >= 0 and ${table.screensReachedTarget} >= 0`,
    ),
    check("settings_pending_cap_check", sql`${table.pendingCap} >= 1`),
  ],
);

// Jobs (R1, U6): Hector's pipeline and Claude's proposals in one table, told apart by review_state
// (KTD8). posting_key is the posting's link as posting-link.ts keys it, unique per owner, so a
// posting is on one job whatever its review. A company or lead source with jobs can't be deleted.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    clientName: text("client_name"),
    role: text("role").notNull(),
    status: text("status").$type<JobStatus>().notNull(),
    nextStep: text("next_step"),
    nextDate: day("next_date"),
    appliedOn: day("applied_on"),
    targetRole: text("target_role"),
    level: text("level").$type<NonNullable<JobFacts["level"]>>(),
    location: text("location"),
    workMode: text("work_mode").$type<NonNullable<JobFacts["workMode"]>>(),
    payMin: integer("pay_min"),
    payMax: integer("pay_max"),
    postingUrl: text("posting_url"),
    postingKey: text("posting_key"),
    summary: text("summary"),
    foundOn: day("found_on").notNull(),
    sourceId: uuid("lead_source_id")
      .notNull()
      .references(() => leadSources.id),
    travelPercent: integer("travel_percent"),
    employmentType:
      text("employment_type").$type<NonNullable<JobFacts["employmentType"]>>(),
    teamSize: integer("team_size"),
    reviewState: text("review_state").$type<ReviewState>().notNull(),
    proposalReason: text("proposal_reason"),
    dismissReason: text("dismiss_reason").$type<DismissReason>(),
    dismissNote: text("dismiss_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("jobs_owner_id_posting_key_idx")
      .on(table.ownerId, table.postingKey)
      .where(sql`${table.postingKey} is not null`),
    index("jobs_owner_id_review_state_idx").on(
      table.ownerId,
      table.reviewState,
      table.nextDate,
    ),
    index("jobs_company_id_idx").on(table.companyId),
    check(
      "jobs_status_check",
      oneOf(table.status, [...OPEN_STATUSES, ...CLOSED_STATUSES]),
    ),
    check("jobs_review_state_check", oneOf(table.reviewState, REVIEW_STATES)),
    check("jobs_level_check", oneOf(table.level, LEVELS)),
    check("jobs_work_mode_check", oneOf(table.workMode, WORK_MODES)),
    check(
      "jobs_employment_type_check",
      oneOf(table.employmentType, EMPLOYMENT_TYPES),
    ),
    check(
      "jobs_dismiss_reason_check",
      oneOf(table.dismissReason, DISMISS_REASONS),
    ),
    check(
      "jobs_pay_check",
      sql`${table.payMin} >= 0 and ${table.payMax} >= 0 and ${table.payMax} >= ${table.payMin}`,
    ),
    check(
      "jobs_travel_percent_check",
      sql`${table.travelPercent} between 0 and 100`,
    ),
    check("jobs_team_size_check", sql`${table.teamSize} > 0`),
  ],
);

// Each status move (KTD7): the date it happened, which counts and yield read, and who made it.
// Append-only; a job's moves go with it.
export const jobStatusChanges = pgTable(
  "job_status_changes",
  {
    // Also the order moves were logged in.
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    ownerId: uuid("owner_id").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").$type<JobStatus>().notNull(),
    toStatus: text("to_status").$type<JobStatus>().notNull(),
    occurredOn: day("occurred_on").notNull(),
    actor: text("actor").$type<ChangeActor>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("job_status_changes_owner_id_occurred_on_idx").on(
      table.ownerId,
      table.occurredOn,
    ),
    index("job_status_changes_job_id_idx").on(table.jobId),
  ],
);

// Dated notes on a record (R1, R21), which point at it by kind and id, as the activity log does.
// A job's notes go with it, in its delete's transaction.
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recordKind: text("record_kind").$type<"job">().notNull(),
    recordId: uuid("record_id").notNull(),
    author: text("author").$type<ChangeActor>().notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("notes_owner_id_record_idx").on(
      table.ownerId,
      table.recordKind,
      table.recordId,
      table.createdAt,
    ),
  ],
);

// People (R7, U7): Hector's contacts, at a company or none. Their messaged, replied and met dates
// come from their interactions (KTD9), never a column here. A company with people can't be
// deleted.
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    companyId: uuid("company_id").references(() => companies.id),
    name: text("name").notNull(),
    role: text("role"),
    howKnown: text("how_known"),
    rank: text("rank").$type<Rank>(),
    ask: text("ask"),
    nextStep: text("next_step"),
    nextDate: day("next_date"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("people_owner_id_name_idx").on(table.ownerId, table.name),
    index("people_company_id_idx").on(table.companyId),
    check("people_rank_check", oneOf(table.rank, RANKS)),
  ],
);

// Interactions (R8, U7): dated events with a person, which the weekly counts and a person's dates
// read (KTD9). A person's go with them; a job's delete leaves its interactions on the person,
// unlinked.
export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    kind: text("kind").$type<InteractionKind>().notNull(),
    occurredOn: day("occurred_on").notNull(),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    note: text("note"),
    state: text("state").$type<ConversationState>(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    author: text("author").$type<ChangeActor>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("interactions_owner_id_occurred_on_idx").on(
      table.ownerId,
      table.occurredOn,
    ),
    index("interactions_person_id_idx").on(table.personId),
    index("interactions_job_id_idx").on(table.jobId),
    check("interactions_kind_check", oneOf(table.kind, INTERACTION_KINDS)),
    check("interactions_state_check", oneOf(table.state, CONVERSATION_STATES)),
    // A conversation has a state, and a message has none.
    check(
      "interactions_conversation_state_check",
      sql`(${table.kind} = 'conversation') = (${table.state} is not null)`,
    ),
    check("interactions_times_check", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

// A job's contacts (R1, U7): the people linked to it. A link goes with its job or its person.
export const jobPeople = pgTable(
  "job_people",
  {
    ownerId: uuid("owner_id").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.jobId, table.personId] }),
    index("job_people_person_id_idx").on(table.personId),
  ],
);

// Weekly reviews (R10, U9): a week's counts and targets as they stood at its first save, fixed from
// then on, and its build milestone and one change. One per owner and week, keyed by its Monday.
export const weeklyReviews = pgTable(
  "weekly_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    week: day("week").notNull(),
    counts: jsonb("counts").$type<WeeklyCounts>().notNull(),
    targets: jsonb("targets").$type<Settings["targets"]>().notNull(),
    milestone: text("milestone"),
    change: text("change"),
    author: text("author").$type<ChangeActor>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("weekly_reviews_owner_id_week_idx").on(
      table.ownerId,
      table.week,
    ),
  ],
);

// The practice log (R11, U8): sessions and their reviews, a row each. A review points at its
// session and goes with it. When the next review is due comes from the rows
// (src/entities/practice-ladder.ts), never a column here.
export const practiceEntries = pgTable(
  "practice_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    kind: text("kind").$type<PracticeKind>().notNull(),
    sessionId: uuid("session_id").references(
      (): AnyPgColumn => practiceEntries.id,
      { onDelete: "cascade" },
    ),
    topic: text("topic"),
    type: text("type"),
    pattern: text("pattern"),
    practicedOn: day("practiced_on").notNull(),
    result: text("result").$type<PracticeResult>().notNull(),
    aiUsed: boolean("ai_used").notNull().default(false),
    minutes: integer("minutes"),
    notes: text("notes"),
    author: text("author").$type<ChangeActor>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("practice_entries_owner_id_practiced_on_idx").on(
      table.ownerId,
      table.practicedOn,
    ),
    index("practice_entries_session_id_idx").on(table.sessionId),
    check("practice_entries_kind_check", oneOf(table.kind, PRACTICE_KINDS)),
    check(
      "practice_entries_result_check",
      oneOf(table.result, PRACTICE_RESULTS),
    ),
    // A review points at its session, and only a session names a problem or topic.
    check(
      "practice_entries_session_check",
      sql`(${table.kind} = 'review') = (${table.sessionId} is not null)`,
    ),
    check(
      "practice_entries_topic_check",
      sql`(${table.kind} = 'session') = (${table.topic} is not null)`,
    ),
    check(
      "practice_entries_minutes_check",
      sql`${table.minutes} between 1 and 600`,
    ),
  ],
);
