import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
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
