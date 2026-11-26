import { z } from "zod";

// Every kind of thing people do that the app keeps a record of (docs/ux-plan.md D106), one
// row each in `activity_events`, never changed once written. A new kind is a new entry here:
// what its details hold, and whether a repeat counts. The table needs no change, since the
// code checks a type rather than the database.
//
// Rows stay as they were written, so a kind's details only ever gain optional fields. A
// change old rows wouldn't pass is a new kind with a new name.
//
// Activity the app makes decisions from (the AI's daily reads, what a clean-up's Undo
// restores) keeps a table of its own with strict columns, and may add an event here as well.
const ACTIVITY_TYPES = {
  // A recipe's page was shown. Shown again within 10 minutes with nothing else opened in
  // between (a reload, a Back to it) is the same view.
  "recipe-viewed": {
    details: z.object({}),
    repeatWindowMs: 10 * 60 * 1000,
  },
} as const satisfies Record<string, ActivityRule>;

type ActivityRule = {
  details: z.ZodObject;
  // How long the same thing again, with nothing of its kind in between, is the same event;
  // null when every one counts.
  repeatWindowMs: number | null;
};

export type ActivityType = keyof typeof ACTIVITY_TYPES;
export type ActivityDetails<T extends ActivityType> = z.infer<
  (typeof ACTIVITY_TYPES)[T]["details"]
>;

// What an activity is about. Books and meal plans are both spaces; each is gone, with its
// activity, when it's deleted.
export type ActivitySubject = { recipeId?: string; spaceId?: string };

export type NewActivity = {
  type: ActivityType;
  userId: string;
  recipeId: string | null;
  spaceId: string | null;
  details: Record<string, unknown>;
};

export type ActivityEvent = NewActivity & { id: string; occurredAt: Date };

// An activity to record, its details checked against its kind's. Details come from the app's
// own code, never a request, so a mismatch is a bug and throws.
export function newActivity<T extends ActivityType>(
  type: T,
  userId: string,
  { recipeId, spaceId }: ActivitySubject,
  details: ActivityDetails<T>,
): NewActivity {
  return {
    type,
    userId,
    recipeId: recipeId ?? null,
    spaceId: spaceId ?? null,
    details: ACTIVITY_TYPES[type].details.parse(details),
  };
}

// Whether `next` is the same event as `last`, this person's latest of its kind: the same
// subject within its kind's repeat window. Then it isn't recorded again, and nothing in an
// order of the latest of each moves.
export function isRepeat(
  last: ActivityEvent | null,
  next: NewActivity,
  now: Date,
): boolean {
  const window = ACTIVITY_TYPES[next.type].repeatWindowMs;
  return (
    window !== null &&
    last !== null &&
    last.type === next.type &&
    last.userId === next.userId &&
    last.recipeId === next.recipeId &&
    last.spaceId === next.spaceId &&
    now.getTime() - last.occurredAt.getTime() < window
  );
}

// A row's type, if the code knows it: one from a newer deploy, or a retired kind, isn't.
export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && Object.hasOwn(ACTIVITY_TYPES, value);
}

// Opening a recipe's page (D106).
export const recordViewSchema = z.object({
  recipeId: z.uuid(),
});
