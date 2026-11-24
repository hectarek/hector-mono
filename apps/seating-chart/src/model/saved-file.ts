import * as z from "zod/mini";

// What the app saves in localStorage and writes to an export file. Naming rules (spec, "The
// saved file"): lengths are whole inches ending in `Inches`; a shape's position is its center;
// angles are clockwise degrees ending in `Degrees`; choice values are hyphenated lowercase words;
// optional fields are left out when empty. The schema uses zod/mini, Zod's smaller build: the
// full one was 26 KB of the app's 63 KB of compressed JavaScript (2026-11-24).
const SAVED_FILE_VERSION = 1;
const EXPORT_REMINDER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const id = z.string().check(z.minLength(1));
const lengthInches = z.int().check(z.positive());
const positionInches = z.int();
const rotationDegrees = z.number().check(z.minimum(0), z.lt(360));
const isoDate = z.iso.datetime();

const tableSchema = z.object({
  id,
  label: z.string(),
  shape: z.enum(["round", "rectangle", "square"]),
  widthInches: lengthInches,
  depthInches: lengthInches,
  seatCount: z.int().check(z.minimum(1), z.maximum(40)),
  seatSides: z.optional(z.enum(["long-sides", "all-sides", "one-side"])),
  xInches: positionInches,
  yInches: positionInches,
  rotationDegrees,
});

const fixtureSchema = z.object({
  id,
  kind: z.enum([
    "dance-floor",
    "stage",
    "bar",
    "buffet",
    "cake-table",
    "gift-table",
    "dj",
    "door",
    "pillar",
    "label",
    "other",
  ]),
  shape: z.enum(["rectangle", "circle"]),
  label: z.string(),
  widthInches: lengthInches,
  depthInches: lengthInches,
  xInches: positionInches,
  yInches: positionInches,
  rotationDegrees,
});

const guestSchema = z.object({
  id,
  name: z.string().check(z.minLength(1)),
  party: z.optional(z.string()),
  group: z.optional(z.string()),
  meal: z.optional(z.string()),
  notes: z.optional(z.string()),
  tableId: z.optional(id),
  seatIndex: z.optional(z.int().check(z.minimum(0))),
});

const planSchema = z.object({
  id,
  name: z.string().check(z.minLength(1)),
  room: z.object({
    widthInches: lengthInches,
    lengthInches: lengthInches,
    gridInches: lengthInches,
  }),
  tables: z.array(tableSchema),
  fixtures: z.array(fixtureSchema),
  guests: z.array(guestSchema),
  updatedAt: isoDate,
});

const savedFileSchema = z
  .object({
    version: z.literal(SAVED_FILE_VERSION),
    plans: z.array(planSchema).check(z.minLength(1)),
    activePlanId: id,
    createdAt: isoDate,
    lastExportedAt: z.optional(isoDate),
  })
  .check(
    z.refine(
      (file) => file.plans.some((plan) => plan.id === file.activePlanId),
      {
        message: "activePlanId names no plan in the file",
        path: ["activePlanId"],
      },
    ),
  );

export type SavedFile = z.infer<typeof savedFileSchema>;
export type Plan = SavedFile["plans"][number];
export type Table = Plan["tables"][number];
export type Fixture = Plan["fixtures"][number];

type ParseResult =
  | { ok: true; file: SavedFile }
  | { ok: false; reason: string };

/** A new file holding one empty plan: a 60 by 40 foot room on a 1-foot grid. */
export function createSavedFile(now: Date): SavedFile {
  const plan: Plan = {
    id: crypto.randomUUID(),
    name: "Reception plan",
    room: { widthInches: 60 * 12, lengthInches: 40 * 12, gridInches: 12 },
    tables: [],
    fixtures: [],
    guests: [],
    updatedAt: now.toISOString(),
  };
  return {
    version: SAVED_FILE_VERSION,
    plans: [plan],
    activePlanId: plan.id,
    createdAt: now.toISOString(),
  };
}

/**
 * Reads saved or imported text. Version 1 is the only version so far; when version 2 arrives,
 * its upgrade of version 1 data goes here, before the schema check.
 */
export function parseSavedFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "The text isn't JSON." };
  }

  const versioned = z.object({ version: z.int() }).safeParse(data);
  if (!versioned.success) {
    return {
      ok: false,
      reason: "It has no version number, so it isn't a seating chart file.",
    };
  }
  if (versioned.data.version > SAVED_FILE_VERSION) {
    return {
      ok: false,
      reason: `It comes from a newer version of the app (file version ${versioned.data.version}).`,
    };
  }

  const parsed = savedFileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `It doesn't match the seating chart format.\n${z.prettifyError(parsed.error)}`,
    };
  }
  return { ok: true, file: withValidSeats(parsed.data) };
}

/** A guest whose table is gone is unseated, and one whose seat number the table lacks keeps the table only. */
function withValidSeats(file: SavedFile): SavedFile {
  return {
    ...file,
    plans: file.plans.map((plan) => {
      const seatCounts = new Map(
        plan.tables.map((table) => [table.id, table.seatCount]),
      );
      return {
        ...plan,
        guests: plan.guests.map((guest) => {
          if (guest.tableId === undefined) return guest;
          const seatCount = seatCounts.get(guest.tableId);
          // An undefined field is left out when the file is written (JSON.stringify drops it).
          if (seatCount === undefined) {
            return { ...guest, tableId: undefined, seatIndex: undefined };
          }
          if (guest.seatIndex !== undefined && guest.seatIndex >= seatCount) {
            return { ...guest, seatIndex: undefined };
          }
          return guest;
        }),
      };
    }),
  };
}

/** The export file's name and text, and the file with its export time recorded. */
export function prepareExport(
  file: SavedFile,
  now: Date,
): { fileName: string; text: string; file: SavedFile } {
  const exported: SavedFile = { ...file, lastExportedAt: now.toISOString() };
  const plan = exported.plans.find((p) => p.id === exported.activePlanId);
  const slug = (plan?.name ?? "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = now.toISOString().slice(0, 10);
  return {
    fileName: `seating-chart-${slug || "plan"}-${date}.json`,
    text: JSON.stringify(exported, null, 2),
    file: exported,
  };
}

/** True when a plan has something in it and the last export (or the file's start) is over a week old. */
export function needsExportReminder(file: SavedFile, now: Date): boolean {
  const hasContent = file.plans.some(
    (plan) =>
      plan.tables.length + plan.fixtures.length + plan.guests.length > 0,
  );
  if (!hasContent) return false;
  const since = Date.parse(file.lastExportedAt ?? file.createdAt);
  return now.getTime() - since > EXPORT_REMINDER_DAYS * DAY_MS;
}

/** How long ago the plan was exported, for the top bar: "today", "yesterday", "3 days ago". */
export function exportAge(file: SavedFile, now: Date): string | null {
  if (file.lastExportedAt === undefined) return null;
  const days = Math.floor(
    (now.getTime() - Date.parse(file.lastExportedAt)) / DAY_MS,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
