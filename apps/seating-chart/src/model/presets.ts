import type { Fixture, Table } from "./saved-file";

// Starting sizes and seat counts. They're common rental sizes, not facts the app vouches for:
// every one can be changed after it's placed (the spec's D3).

type TablePreset = Omit<
  Table,
  "id" | "label" | "xInches" | "yInches" | "rotationDegrees"
> & {
  id: string;
  name: string;
};

type FixturePreset = Omit<
  Fixture,
  "id" | "xInches" | "yInches" | "rotationDegrees"
>;

export const TABLE_PRESETS = [
  {
    id: "round-48-inch",
    name: "48″ round",
    shape: "round",
    widthInches: 48,
    depthInches: 48,
    seatCount: 6,
  },
  {
    id: "round-60-inch",
    name: "60″ round",
    shape: "round",
    widthInches: 60,
    depthInches: 60,
    seatCount: 8,
  },
  {
    id: "round-72-inch",
    name: "72″ round",
    shape: "round",
    widthInches: 72,
    depthInches: 72,
    seatCount: 10,
  },
  {
    id: "square-36-inch",
    name: "36″ square",
    shape: "square",
    widthInches: 36,
    depthInches: 36,
    seatCount: 4,
  },
  {
    id: "square-60-inch",
    name: "60″ square",
    shape: "square",
    widthInches: 60,
    depthInches: 60,
    seatCount: 8,
  },
  {
    id: "banquet-6-foot",
    name: "6′ banquet",
    shape: "rectangle",
    widthInches: 72,
    depthInches: 30,
    seatCount: 6,
    seatSides: "long-sides",
  },
  {
    id: "banquet-8-foot",
    name: "8′ banquet",
    shape: "rectangle",
    widthInches: 96,
    depthInches: 30,
    seatCount: 8,
    seatSides: "long-sides",
  },
  {
    id: "head-table-8-foot",
    name: "Head table",
    shape: "rectangle",
    widthInches: 96,
    depthInches: 30,
    seatCount: 4,
    seatSides: "one-side",
  },
  {
    id: "sweetheart",
    name: "Sweetheart",
    shape: "rectangle",
    widthInches: 48,
    depthInches: 30,
    seatCount: 2,
    seatSides: "one-side",
  },
] as const satisfies readonly TablePreset[];

export const FIXTURE_PRESETS = [
  {
    kind: "dance-floor",
    label: "Dance floor",
    shape: "rectangle",
    widthInches: 192,
    depthInches: 192,
  },
  {
    kind: "stage",
    label: "Stage",
    shape: "rectangle",
    widthInches: 192,
    depthInches: 96,
  },
  {
    kind: "bar",
    label: "Bar",
    shape: "rectangle",
    widthInches: 96,
    depthInches: 36,
  },
  {
    kind: "buffet",
    label: "Buffet",
    shape: "rectangle",
    widthInches: 96,
    depthInches: 30,
  },
  {
    kind: "cake-table",
    label: "Cake",
    shape: "circle",
    widthInches: 36,
    depthInches: 36,
  },
  {
    kind: "gift-table",
    label: "Gifts",
    shape: "rectangle",
    widthInches: 72,
    depthInches: 30,
  },
  {
    kind: "dj",
    label: "DJ",
    shape: "rectangle",
    widthInches: 72,
    depthInches: 30,
  },
  {
    kind: "door",
    label: "Door",
    shape: "rectangle",
    widthInches: 48,
    depthInches: 8,
  },
  {
    kind: "pillar",
    label: "Pillar",
    shape: "circle",
    widthInches: 24,
    depthInches: 24,
  },
  {
    kind: "label",
    label: "Label",
    shape: "rectangle",
    widthInches: 96,
    depthInches: 24,
  },
  {
    kind: "other",
    label: "Shape",
    shape: "rectangle",
    widthInches: 48,
    depthInches: 48,
  },
] as const satisfies readonly FixturePreset[];

export type TablePresetId = (typeof TABLE_PRESETS)[number]["id"];

type At = { xInches: number; yInches: number };

/** The next free number after the highest "Table N" label: Table 1, Table 2… */
export function nextTableLabel(tables: readonly Table[]): string {
  const numbers = tables
    .map((table) => /^Table (\d+)$/.exec(table.label)?.[1])
    .map(Number);
  const highest = Math.max(0, ...numbers.filter((n) => Number.isInteger(n)));
  return `Table ${highest + 1}`;
}

export function createTable(
  presetId: TablePresetId,
  at: At,
  tables: readonly Table[],
): Table {
  const preset = TABLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`No table preset "${presetId}"`);
  const seatSides = "seatSides" in preset ? preset.seatSides : undefined;
  return {
    shape: preset.shape,
    widthInches: preset.widthInches,
    depthInches: preset.depthInches,
    seatCount: preset.seatCount,
    seatSides,
    id: crypto.randomUUID(),
    // A head or sweetheart table is named for what it is; the rest are numbered.
    label: seatSides === "one-side" ? preset.name : nextTableLabel(tables),
    xInches: Math.round(at.xInches),
    yInches: Math.round(at.yInches),
    rotationDegrees: 0,
  };
}

export function createFixture(kind: Fixture["kind"], at: At): Fixture {
  const preset = FIXTURE_PRESETS.find((p) => p.kind === kind);
  if (!preset) throw new Error(`No fixture preset "${kind}"`);
  return {
    ...preset,
    id: crypto.randomUUID(),
    xInches: Math.round(at.xInches),
    yInches: Math.round(at.yInches),
    rotationDegrees: 0,
  };
}

/**
 * What changes when a table changes shape. A round or square table is as deep as it is wide;
 * a rectangle made from one keeps its width as its length and gets a 30-inch depth.
 */
export function changeTableShape(
  table: Table,
  shape: Table["shape"],
): Partial<Table> {
  if (shape === "round")
    return { shape, depthInches: table.widthInches, seatSides: undefined };
  if (shape === "square")
    return { shape, depthInches: table.widthInches, seatSides: "all-sides" };
  return {
    shape,
    depthInches:
      table.depthInches === table.widthInches ? 30 : table.depthInches,
    seatSides: "long-sides",
  };
}
