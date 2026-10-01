import type { Aisle } from "./aisles";
import { itemizeLine } from "./ingredient-item";
import { UNITS, type Unit } from "./ingredient-line";
import { linesFromText } from "./ingredient-text";
import type {
  RecipeIngredient,
  RecipeIngredientInput,
} from "./models/recipe-ingredient.model";
import type { RecipeStepInput } from "./models/recipe-step.model";
import { amountText, readAmount } from "./scaling";
import { stepsFromMarkdown, withSections } from "./step-text";

// The recipe editor's rows (ux-plan P9.4). An ingredient line keeps its original text
// (`raw`) only until one of its fields is changed. In both lists a section row heads the rows
// below it (D35 for steps).
export type LineRow = {
  kind: "line";
  key: string;
  raw: string | null;
  amount: string;
  unit: Unit | null;
  name: string;
  note: string;
  optional: boolean;
  // The catalog aisle an import's reader suggested (D25), kept until the name changes.
  aisle: Aisle | null;
};
export type SectionRow = { kind: "section"; key: string; title: string };
export type IngredientRow = LineRow | SectionRow;
export type StepRow = {
  kind: "step";
  key: string;
  text: string;
  timer: string;
};
export type MethodRow = StepRow | SectionRow;

export const newKey = (): string => crypto.randomUUID();

export function emptyLine(): LineRow {
  return {
    kind: "line",
    key: newKey(),
    raw: null,
    amount: "",
    unit: null,
    name: "",
    note: "",
    optional: false,
    aisle: null,
  };
}

export function emptyStep(): StepRow {
  return { kind: "step", key: newKey(), text: "", timer: "" };
}

export function isBlankLine(row: LineRow): boolean {
  return !row.amount.trim() && !row.name.trim() && !row.note.trim();
}

// A recipe's stored lines (or an import's draft lines) as rows, with a section row wherever
// the section changes.
export function rowsFromLines(
  lines: (Pick<
    RecipeIngredient,
    "raw" | "section" | "quantity" | "unit" | "name" | "note" | "optional"
  > & { aisle?: Aisle | null })[],
): IngredientRow[] {
  const rows: IngredientRow[] = [];
  let section: string | null = null;
  for (const line of lines) {
    if (line.section !== section) {
      rows.push({ kind: "section", key: newKey(), title: line.section ?? "" });
      section = line.section;
    }
    // A line stored before itemizing has no name yet: its text split stands in.
    const fields = line.name === null ? itemizeLine(line.raw) : line;
    rows.push({
      kind: "line",
      key: newKey(),
      raw: line.raw,
      amount: fields.quantity === null ? "" : amountText(fields.quantity),
      unit: UNITS.find((unit) => unit === fields.unit) ?? null,
      name: fields.name ?? "",
      note: fields.note ?? "",
      optional: fields.optional,
      aisle: line.aisle ?? null,
    });
  }
  return rows;
}

// Pasted lines as rows, split instantly by the text parser; "Sauce:" lines become sections.
export function rowsFromText(text: string): IngredientRow[] {
  const rows: IngredientRow[] = [];
  let section: string | undefined;
  for (const line of linesFromText(text)) {
    if (line.section !== section) {
      rows.push({ kind: "section", key: newKey(), title: line.section ?? "" });
      section = line.section;
    }
    const fields = itemizeLine(line.raw);
    rows.push({
      kind: "line",
      key: newKey(),
      raw: line.raw,
      amount: fields.quantity === null ? "" : amountText(fields.quantity),
      unit: fields.unit,
      name: fields.name ?? "",
      note: fields.note ?? "",
      optional: fields.optional,
      aisle: null,
    });
  }
  return rows;
}

// Pasted rows at the row at `at` (P14.7): in its place when `replace` (it's empty), else after
// it. When the paste brings sections, the rows after it would fall under the last of them, so
// the section they were in is started again after the paste.
export function pasteRows<T extends IngredientRow | MethodRow>(
  rows: T[],
  at: number,
  pasted: T[],
  replace: boolean,
): (T | SectionRow)[] {
  const after = rows.slice(at + 1);
  const pieces: (T | SectionRow)[] = [
    ...rows.slice(0, replace ? at : at + 1),
    ...pasted,
  ];
  if (
    pasted.some((row) => row.kind === "section") &&
    after.length &&
    after[0]?.kind !== "section"
  ) {
    const upTo: (IngredientRow | MethodRow)[] = rows.slice(0, at + 1);
    const title = upTo.reduce(
      (current, row) => (row.kind === "section" ? row.title : current),
      "",
    );
    pieces.push({ kind: "section", key: newKey(), title });
  }
  return [...pieces, ...after];
}

// A named section with nothing under it would vanish on save, so it's a problem to fix
// (P14.7): the first one in the rows, given whether a row counts as something under it.
function emptySection(
  rows: (IngredientRow | MethodRow)[],
  hasContent: (row: LineRow | StepRow) => boolean,
): SectionRow | null {
  let open: SectionRow | null = null;
  for (const row of rows) {
    if (row.kind === "section") {
      if (open) return open;
      open = row.title.trim() ? row : null;
    } else if (hasContent(row)) {
      open = null;
    }
  }
  return open;
}

// A problem to fix before saving, in the words the form shows, and the row it's on.
export type RowProblem = { problem: string; key: string | null };

// What the server is sent, or the first problem to fix. Blank rows are left out; a section
// applies to the lines below it until the next one.
export function ingredientInputs(
  rows: IngredientRow[],
): { lines: RecipeIngredientInput[]; problem: null } | RowProblem {
  const lines: RecipeIngredientInput[] = [];
  let section: string | undefined;
  let number = 0;
  for (const row of rows) {
    if (row.kind === "section") {
      section = row.title.trim() || undefined;
      continue;
    }
    number++;
    if (isBlankLine(row)) continue;

    const name = row.name.trim();
    if (!name) {
      return { problem: `Ingredient ${number} needs a name`, key: row.key };
    }
    const quantity = row.amount.trim() ? readAmount(row.amount) : null;
    if (row.amount.trim() && quantity === null) {
      return {
        problem: `Ingredient ${number}'s amount "${row.amount.trim()}" isn't a number`,
        key: row.key,
      };
    }
    lines.push({
      ...(row.raw ? { raw: row.raw } : {}),
      ...(section ? { section } : {}),
      name,
      quantity,
      unit: row.unit,
      note: row.note.trim() || null,
      optional: row.optional,
      ...(row.aisle ? { aisle: row.aisle } : {}),
    });
  }
  const empty = emptySection(
    rows,
    (row) => row.kind === "line" && !isBlankLine(row),
  );
  if (empty) {
    return {
      problem: `Section "${empty.title.trim()}" has no ingredients under it. Add one, or remove it.`,
      key: empty.key,
    };
  }
  return lines.length
    ? { lines, problem: null }
    : { problem: "Add at least one ingredient", key: null };
}

// A recipe's stored steps as rows, with a section row wherever the section changes.
export function stepRowsFrom(
  steps: {
    text: string;
    timerMinutes: number | null;
    section: string | null;
  }[],
): MethodRow[] {
  const rows: MethodRow[] = [];
  let section: string | null = null;
  for (const step of steps) {
    if (step.section !== section) {
      rows.push({ kind: "section", key: newKey(), title: step.section ?? "" });
      section = step.section;
    }
    rows.push({
      kind: "step",
      key: newKey(),
      text: step.text,
      timer: step.timerMinutes === null ? "" : String(step.timerMinutes),
    });
  }
  return rows;
}

// Pasted steps as rows, split the way instructions are (a numbered list, or paragraphs), with
// a heading line as a section row.
export function stepRowsFromText(text: string): MethodRow[] {
  return stepRowsFrom(
    withSections(stepsFromMarkdown(text)).map((step) => ({
      ...step,
      timerMinutes: null,
    })),
  );
}

// What the server is sent, or the first problem to fix, as for ingredients.
export function stepInputs(
  rows: MethodRow[],
): { steps: RecipeStepInput[]; problem: null } | RowProblem {
  const steps: RecipeStepInput[] = [];
  let section: string | undefined;
  let number = 0;
  for (const row of rows) {
    if (row.kind === "section") {
      section = row.title.trim() || undefined;
      continue;
    }
    number++;
    const text = row.text.replace(/\s+/g, " ").trim();
    const timer = row.timer.trim();
    if (!text) {
      if (timer) {
        return {
          problem: `Step ${number} has a timer but no text`,
          key: row.key,
        };
      }
      continue;
    }
    const minutes = timer ? Number(timer) : null;
    if (minutes !== null && !(Number.isInteger(minutes) && minutes > 0)) {
      return {
        problem: `Step ${number}'s timer should be a whole number of minutes`,
        key: row.key,
      };
    }
    steps.push({
      text,
      timerMinutes: minutes,
      ...(section ? { section } : {}),
    });
  }
  const empty = emptySection(
    rows,
    (row) => row.kind === "step" && Boolean(row.text.trim()),
  );
  if (empty) {
    return {
      problem: `Section "${empty.title.trim()}" has no steps under it. Add one, or remove it.`,
      key: empty.key,
    };
  }
  return { steps, problem: null };
}

// The rows as the editor lays them out: each section row, then a list of the rows under it,
// so a screen reader's "item 3 of 5" counts only lines or steps. Rows before the first
// section have none.
export type RowRun<T> = { section: SectionRow | null; rows: T[] };

export function rowRuns<T extends IngredientRow | MethodRow>(
  rows: T[],
): RowRun<Exclude<T, SectionRow>>[] {
  const runs: RowRun<Exclude<T, SectionRow>>[] = [];
  for (const row of rows) {
    if (row.kind === "section") {
      runs.push({ section: row, rows: [] });
    } else {
      const run = runs.at(-1) ?? { section: null, rows: [] };
      if (!runs.length) runs.push(run);
      run.rows.push(row as Exclude<T, SectionRow>);
    }
  }
  return runs;
}

// Moves the row at `index` by `by` places, keeping it inside the list.
export function moveRow<T>(rows: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  const row = rows[index];
  if (row === undefined || to < 0 || to >= rows.length) return rows;
  const next = [...rows];
  next.splice(index, 1);
  next.splice(to, 0, row);
  return next;
}
