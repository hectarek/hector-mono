import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ActivityAction,
  ChangeActor,
  FieldChange,
  RecordRef,
} from "@/src/entities/models/activity.model";

// The app's tables, added by the units that need them (docs/build-plan.md). Every root table
// carries owner_id (KTD2).

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

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
