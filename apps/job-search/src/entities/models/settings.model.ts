import { z } from "zod";
import { dateSchema, timeSchema } from "./input.model";

// The week's counts (R10), each with a weekly target Hector sets (R12).
export const WEEKLY_COUNTS = [
  "messagesSent",
  "conversationsHeld",
  "applications",
  "practiceSessions",
  "screensReached",
] as const;
export type WeeklyCount = (typeof WEEKLY_COUNTS)[number];

// A checkpoint on the search season's track (R9 and R12 as revised 2026-11-10): its day and a
// short name.
export type Checkpoint = { on: string; name: string };

// The search season Today tracks toward (R9 and R12 as revised 2026-11-10): its start, its finish
// and up to three checkpoints between them, in date order.
export type Season = {
  start: string;
  finish: string;
  checkpoints: Checkpoint[];
};

// The most checkpoints a season has, and the longest name one takes.
const MAX_CHECKPOINTS = 3;
const CHECKPOINT_NAME_MAX = 40;

// Hector's settings, which only he changes (R12, R21): a target for each weekly count, null where
// he set none, the yearly pay floor the ranked list weighs a posted band against (KTD23), null
// when unset, and the search season, null until he sets its start and finish.
export type Settings = {
  targets: Record<WeeklyCount, number | null>;
  payFloor: number | null;
  season: Season | null;
  // When they were last saved, which a change sends back (R22): null before the first save.
  updatedAt: Date | null;
};

export type SettingsValues = Omit<Settings, "updatedAt">;

// The settings until Hector saves his own.
export const DEFAULT_SETTINGS: Settings = {
  targets: {
    messagesSent: null,
    conversationsHeld: null,
    applications: null,
    practiceSessions: null,
    screensReached: null,
  },
  payFloor: null,
  season: null,
  updatedAt: null,
};

// get_settings takes nothing.
export const getSettingsSchema = z.object({});

const targetSchema = z
  .int({ error: "Use a whole number" })
  .min(0, { error: "At least 0" })
  .max(1000, { error: "At most 1000" })
  .nullable();

// The settings form's input: every value, and the updatedAt it read, null when no settings were
// saved yet. The season comes as its start and finish, both or neither, and the form's checkpoint
// rows, each a day and a name, where a row left blank is no checkpoint. It's saved as one season,
// its checkpoints in date order.
export const updateSettingsSchema = z
  .object({
    targets: z.object({
      messagesSent: targetSchema,
      conversationsHeld: targetSchema,
      applications: targetSchema,
      practiceSessions: targetSchema,
      screensReached: targetSchema,
    }),
    payFloor: z
      .int({ error: "Use whole dollars a year" })
      .min(0, { error: "At least 0" })
      .max(10_000_000, { error: "At most 10,000,000" })
      .nullable(),
    seasonStart: dateSchema.nullable(),
    seasonFinish: dateSchema.nullable(),
    checkpoints: z
      .array(z.object({ on: z.string(), name: z.string() }))
      .max(MAX_CHECKPOINTS, {
        error: `At most ${MAX_CHECKPOINTS} checkpoints`,
      }),
    updatedAt: timeSchema.nullable(),
  })
  .superRefine(checkSeason)
  .transform(({ seasonStart, seasonFinish, checkpoints, ...values }) => ({
    ...values,
    season:
      seasonStart && seasonFinish
        ? {
            start: seasonStart,
            finish: seasonFinish,
            checkpoints: filledRows(checkpoints)
              .map(({ on, name }) => ({ on, name: name.trim() }))
              .sort((a, b) => a.on.localeCompare(b.on)),
          }
        : null,
  }));
export type UpdateSettingsInput = z.output<typeof updateSettingsSchema>;

type CheckpointRow = { on: string; name: string };

// The rows with a day or a name typed, each with its row's number, as the form shows them.
function filledRows(rows: CheckpointRow[]) {
  return rows
    .map((row, index) => ({ ...row, row: index + 1 }))
    .filter(({ on, name }) => on || name.trim());
}

// The season's checks: a start and a finish set together, the finish after the start, and each
// checkpoint named, on a day between them, no two on one day. Each message names what it's
// about, a checkpoint by its row, as the form shows it under its field.
function checkSeason(
  {
    seasonStart: start,
    seasonFinish: finish,
    checkpoints,
  }: {
    seasonStart: string | null;
    seasonFinish: string | null;
    checkpoints: CheckpointRow[];
  },
  ctx: z.RefinementCtx,
) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });
  const rows = filledRows(checkpoints);
  if (start === null || finish === null) {
    if (start !== null) issue("seasonFinish", "Needed with the season's start");
    if (finish !== null) {
      issue("seasonStart", "Needed with the season's finish");
    }
    if (rows.length) {
      issue("checkpoints", "Checkpoints need the season's start and finish");
    }
    return;
  }
  if (finish <= start) {
    issue("seasonFinish", "After the season's start");
    return;
  }
  for (const { on, name, row } of rows) {
    const which = `Checkpoint ${row}`;
    if (!name.trim()) {
      issue("checkpoints", `${which} needs a short name`);
    } else if (name.trim().length > CHECKPOINT_NAME_MAX) {
      issue(
        "checkpoints",
        `${which}'s name takes at most ${CHECKPOINT_NAME_MAX} characters`,
      );
    }
    if (!dateSchema.safeParse(on).success) {
      issue("checkpoints", `${which} needs a date like 2026-12-01`);
    } else if (on <= start || on >= finish) {
      issue(
        "checkpoints",
        `${which} needs a date between the season's start and finish`,
      );
    }
  }
  if (new Set(rows.map(({ on }) => on)).size < rows.length) {
    issue("checkpoints", "Checkpoints need days of their own");
  }
}
