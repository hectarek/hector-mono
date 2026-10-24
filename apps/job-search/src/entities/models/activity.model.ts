import { z } from "zod";

// Who made a change (R19, docs/build-plan.md KTD7): Hector's session, Claude's, the one-time
// import, or the app itself.
const changeActorSchema = z.enum(["owner", "agent", "import", "system"]);
export type ChangeActor = z.infer<typeof changeActorSchema>;

// What each write's use case is given (KTD3): who is acting, on whose rows, and the page tool's
// name when one made the call. The tool is only a label from the page: who is acting comes from
// the session.
export type ChangeContext = {
  actor: ChangeActor;
  ownerId: string;
  tool?: string;
};

// The records that keep a history, each added by the unit that brings it (R19).
const recordKindSchema = z.enum(["company", "job", "person"]);
export type RecordRef = { kind: z.infer<typeof recordKindSchema>; id: string };

export type ActivityAction = "created" | "updated" | "deleted" | "refused";

// One field a change touched, before and after: null where it had no value.
export type FieldChange = { field: string; before: unknown; after: unknown };

// One change, as the log keeps it. Append-only: never edited or removed.
export type ActivityEntry = {
  id: number;
  createdAt: Date;
  actor: ChangeActor;
  tool: string | null;
  record: RecordRef;
  action: ActivityAction;
  // Only the fields whose values changed, in the order the change gave them.
  changes: FieldChange[];
  // Why, when the change takes a reason (closing a job). On a refusal, what was tried.
  reason: string | null;
};

export type NewActivityEntry = Omit<ActivityEntry, "id" | "createdAt"> & {
  ownerId: string;
};

// The most a page holds, and so the most a record's history shows at once.
export const ACTIVITY_PAGE_MAX = 50;

// Times come with their offset (KTD18): "2026-10-23T09:00:00-04:00", or "Z" for UTC.
const timeSchema = z.iso
  .datetime({
    offset: true,
    error: "Use an ISO time with an offset, like 2026-10-23T09:00:00-04:00",
  })
  .transform((value) => new Date(value));

// What list_activity takes, and a record's history asks for: an owner's changes, newest first,
// narrowed to one record, one kind of actor and a window of time (since is inclusive, until
// isn't), a page at a time.
export const listActivitySchema = z.object({
  record: z.object({ kind: recordKindSchema, id: z.uuid() }).optional(),
  actor: changeActorSchema.optional(),
  since: timeSchema.optional(),
  until: timeSchema.optional(),
  limit: z.int().min(1).max(ACTIVITY_PAGE_MAX).default(20),
  offset: z.int().min(0).default(0),
});
export type ActivityFilter = z.output<typeof listActivitySchema>;

// nextOffset: where the next page starts, or null on the last one.
export type ActivityPage = {
  entries: ActivityEntry[];
  nextOffset: number | null;
};
