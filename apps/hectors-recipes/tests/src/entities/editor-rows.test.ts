import { describe, expect, it } from "bun:test";
import {
  emptyLine,
  type IngredientRow,
  ingredientInputs,
  type LineRow,
  type MethodRow,
  moveRow,
  pasteRows,
  rowRuns,
  rowsFromLines,
  rowsFromText,
  type StepRow,
  stepInputs,
  stepRowsFrom,
  stepRowsFromText,
} from "@/src/entities/editor-rows";

const stored = (fields: {
  raw: string;
  section?: string | null;
  name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  note?: string | null;
  optional?: boolean;
}) => ({
  section: null,
  name: null,
  quantity: null,
  unit: null,
  note: null,
  optional: false,
  ...fields,
});

// What a row shows, without its generated key.
const shown = (rows: IngredientRow[]) =>
  rows.map((row) =>
    row.kind === "section"
      ? { section: row.title }
      : [row.amount, row.unit, row.name, row.note, row.optional],
  );

describe("rowsFromLines", () => {
  it("shows each stored line's fields, with a section row where the section changes", () => {
    const rows = rowsFromLines([
      stored({ raw: "1 cup rice", name: "rice", quantity: 1, unit: "cup" }),
      stored({
        raw: "1/3 cup tahini",
        section: "Sauce",
        name: "tahini",
        quantity: 1 / 3,
        unit: "cup",
      }),
      stored({
        raw: "Salt, to taste",
        section: "Sauce",
        name: "Salt",
        note: "to taste",
      }),
    ]);
    expect(shown(rows)).toEqual([
      ["1", "cup", "rice", "", false],
      { section: "Sauce" },
      ["⅓", "cup", "tahini", "", false],
      ["", null, "Salt", "to taste", false],
    ]);
    // Untouched rows carry their original line, so saving keeps it.
    expect((rows[0] as LineRow).raw).toBe("1 cup rice");
  });

  it("splits a line stored before itemizing from its text", () => {
    expect(
      shown(rowsFromLines([stored({ raw: "4 garlic cloves, minced" })])),
    ).toEqual([["4", "clove", "garlic", "minced", false]]);
  });
});

describe("rowsFromText", () => {
  it("splits a pasted list into rows, with sections", () => {
    expect(
      shown(
        rowsFromText(
          "2 tbsp olive oil\n\nTo serve:\n- [ ] Fresh parsley, chopped",
        ),
      ),
    ).toEqual([
      ["2", "tbsp", "olive oil", "", false],
      { section: "To serve" },
      ["", null, "Fresh parsley", "chopped", false],
    ]);
  });
});

describe("ingredientInputs", () => {
  const line = (fields: Partial<LineRow>): LineRow => ({
    ...emptyLine(),
    ...fields,
  });

  it("sends each line's fields under its section, leaving blank rows out", () => {
    const result = ingredientInputs([
      line({ raw: "1 cup rice", amount: "1", unit: "cup", name: "rice" }),
      line({}),
      { kind: "section", key: "s", title: " Sauce " },
      line({ amount: "1 1/2", unit: "tbsp", name: " tahini ", note: " " }),
    ]);
    expect(result).toEqual({
      problem: null,
      lines: [
        {
          raw: "1 cup rice",
          name: "rice",
          quantity: 1,
          unit: "cup",
          note: null,
          optional: false,
        },
        {
          section: "Sauce",
          name: "tahini",
          quantity: 1.5,
          unit: "tbsp",
          note: null,
          optional: false,
        },
      ],
    });
  });

  it("sends an import's suggested aisle with its line", () => {
    const result = ingredientInputs([
      line({ name: "black beans", aisle: "canned-and-jarred" }),
    ]);
    expect(result.problem === null && result.lines[0]?.aisle).toBe(
      "canned-and-jarred",
    );
  });

  it("names the first problem and its row", () => {
    const noName = line({ amount: "2" });
    expect(ingredientInputs([line({ name: "rice" }), noName])).toEqual({
      problem: "Ingredient 2 needs a name",
      key: noName.key,
    });
    const badAmount = line({ amount: "a few", name: "eggs" });
    expect(ingredientInputs([badAmount])).toEqual({
      problem: `Ingredient 1's amount "a few" isn't a number`,
      key: badAmount.key,
    });
    expect(ingredientInputs([line({})])).toEqual({
      problem: "Add at least one ingredient",
      key: null,
    });
  });
});

describe("steps", () => {
  it("splits pasted steps the way instructions are split", () => {
    expect(
      stepRowsFromText("1. Chop.\n2. Fry for 5 minutes.").map((row) =>
        row.kind === "step" ? row.text : `# ${row.title}`,
      ),
    ).toEqual(["Chop.", "Fry for 5 minutes."]);
  });

  it("sends each step's text and timer, leaving blank steps out", () => {
    expect(
      stepInputs([
        step("a", "Chop the\n onion. "),
        step("b", "  "),
        step("c", "Simmer.", " 20 "),
      ]),
    ).toEqual({
      problem: null,
      steps: [
        { text: "Chop the onion.", timerMinutes: null },
        { text: "Simmer.", timerMinutes: 20 },
      ],
    });
  });

  it("names a bad timer and its step", () => {
    expect(stepInputs([step("a", "Rest.", "1.5")])).toEqual({
      problem: "Step 1's timer should be a whole number of minutes",
      key: "a",
    });
    expect(stepInputs([step("a", "", "5")])).toEqual({
      problem: "Step 1 has a timer but no text",
      key: "a",
    });
  });

  // Babish Mac n Cheese: two methods, each under its own heading (ux-plan D35).
  it("shows stored sections as section rows, and turns a pasted heading into one", () => {
    const shownSteps = (rows: MethodRow[]) =>
      rows.map((row) => (row.kind === "section" ? `# ${row.title}` : row.text));
    expect(
      shownSteps(
        stepRowsFrom([
          { text: "Cook the pasta.", timerMinutes: null, section: "Mac" },
          { text: "Bake.", timerMinutes: 45, section: "Mac" },
          { text: "Melt the butter.", timerMinutes: null, section: "Sauce" },
        ]),
      ),
    ).toEqual([
      "# Mac",
      "Cook the pasta.",
      "Bake.",
      "# Sauce",
      "Melt the butter.",
    ]);
    expect(
      shownSteps(
        stepRowsFromText("**Sauce Method:**\n\n1. Melt the butter.\n2. Whisk."),
      ),
    ).toEqual(["# Sauce Method", "Melt the butter.", "Whisk."]);
  });

  it("makes sections of pasted headings, but not of a short bold instruction", () => {
    const shownSteps = (rows: MethodRow[]) =>
      rows.map((row) => (row.kind === "section" ? `# ${row.title}` : row.text));
    expect(
      shownSteps(
        stepRowsFromText(
          "**Sauce:**\n1. Melt the butter.\n2. Whisk in flour.\n**Pasta:**\n3. Boil the pasta.",
        ),
      ),
    ).toEqual([
      "# Sauce",
      "Melt the butter.",
      "Whisk in flour.",
      "# Pasta",
      "Boil the pasta.",
    ]);
    expect(
      shownSteps(stepRowsFromText("For the sauce:\n\nMelt butter.\n\nWhisk.")),
    ).toEqual(["# For the sauce", "Melt butter.", "Whisk."]);
    expect(
      shownSteps(
        stepRowsFromText("1. **Don't overmix!**\n2. Bake 20 minutes."),
      ),
    ).toEqual(["**Don't overmix!**", "Bake 20 minutes."]);
  });

  it("stops at a named section with nothing under it", () => {
    const toServe = { kind: "section" as const, key: "t", title: "To serve" };
    const none = { kind: "section" as const, key: "n", title: "" };
    expect(stepInputs([step("a", "Bake."), toServe])).toEqual({
      problem:
        'Section "To serve" has no steps under it. Add one, or remove it.',
      key: "t",
    });
    expect(
      stepInputs([toServe, step("a", ""), none, step("b", "Bake.")]),
    ).toEqual({
      problem:
        'Section "To serve" has no steps under it. Add one, or remove it.',
      key: "t",
    });
    // An unnamed one only ends the section before it.
    expect(stepInputs([step("a", "Bake."), none])).toEqual({
      problem: null,
      steps: [{ text: "Bake.", timerMinutes: null }],
    });
    expect(
      ingredientInputs([
        { kind: "section", key: "t", title: "To serve" },
        emptyLine(),
      ]),
    ).toEqual({
      problem:
        'Section "To serve" has no ingredients under it. Add one, or remove it.',
      key: "t",
    });
  });

  it("sends each step under its section, and numbers only the steps", () => {
    const sauce = { kind: "section" as const, key: "s", title: " Sauce " };
    const none = { kind: "section" as const, key: "n", title: "" };
    expect(
      stepInputs([sauce, step("a", "Melt."), none, step("b", "Serve.")]),
    ).toEqual({
      problem: null,
      steps: [
        { text: "Melt.", timerMinutes: null, section: "Sauce" },
        { text: "Serve.", timerMinutes: null },
      ],
    });
    expect(stepInputs([sauce, step("a", "Melt."), step("b", "", "5")])).toEqual(
      { problem: "Step 2 has a timer but no text", key: "b" },
    );
  });
});

function step(key: string, text: string, timer = ""): StepRow {
  return { kind: "step", key, text, timer };
}

// Pasting into a row (P14.7): in its place when it's empty, else after it, and the rows after
// the paste stay in the section they were in.
describe("pasteRows", () => {
  const titles = (rows: MethodRow[]) =>
    rows.map((row) => (row.kind === "section" ? `# ${row.title}` : row.text));
  const pasta = { kind: "section" as const, key: "p", title: "Pasta" };
  const rows = [pasta, step("a", "Boil."), step("b", ""), step("c", "Drain.")];
  const pasted = stepRowsFromText("**Sauce:**\n\nMelt butter\n\nWhisk flour");

  it("keeps the rows after a pasted section in the section they were in", () => {
    expect(titles(pasteRows(rows, 2, pasted, true))).toEqual([
      "# Pasta",
      "Boil.",
      "# Sauce",
      "Melt butter",
      "Whisk flour",
      "# Pasta",
      "Drain.",
    ]);
  });

  it("goes after a row that has text, and needs no repeat when nothing follows", () => {
    expect(titles(pasteRows(rows, 3, pasted, false))).toEqual([
      "# Pasta",
      "Boil.",
      "",
      "Drain.",
      "# Sauce",
      "Melt butter",
      "Whisk flour",
    ]);
  });

  it("repeats no section when the paste has none, or the next row starts one", () => {
    const plain = stepRowsFromText("1. Melt butter\n2. Whisk flour");
    expect(titles(pasteRows(rows, 2, plain, true))).toEqual([
      "# Pasta",
      "Boil.",
      "Melt butter",
      "Whisk flour",
      "Drain.",
    ]);
    const sauce = { kind: "section" as const, key: "s", title: "Sauce" };
    const beforeSection = [
      step("a", "Boil."),
      step("b", ""),
      sauce,
      step("c", "Melt."),
    ];
    expect(titles(pasteRows(beforeSection, 1, pasted, true))).toEqual([
      "Boil.",
      "# Sauce",
      "Melt butter",
      "Whisk flour",
      "# Sauce",
      "Melt.",
    ]);
    const untitled = [step("a", ""), step("b", "Serve.")];
    expect(titles(pasteRows(untitled, 0, pasted, true))).toEqual([
      "# Sauce",
      "Melt butter",
      "Whisk flour",
      "# ",
      "Serve.",
    ]);
  });
});

describe("rowRuns", () => {
  it("puts each section's rows in a list of their own, a section with none included", () => {
    const pasta = { kind: "section" as const, key: "p", title: "Pasta" };
    const empty = { kind: "section" as const, key: "e", title: "To serve" };
    const runs = rowRuns([
      step("a", "Prep."),
      pasta,
      step("b", "Boil."),
      step("c", "Drain."),
      empty,
    ]);
    expect(
      runs.map((run) => [
        run.section?.title ?? null,
        run.rows.map((row) => row.key),
      ]),
    ).toEqual([
      [null, ["a"]],
      ["Pasta", ["b", "c"]],
      ["To serve", []],
    ]);
    expect(rowRuns([])).toEqual([]);
  });
});

describe("moveRow", () => {
  it("moves a row one place, and not past either end", () => {
    expect(moveRow(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveRow(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveRow(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveRow(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});
