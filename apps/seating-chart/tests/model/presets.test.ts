import { describe, expect, test } from "bun:test";
import {
  changeTableShape,
  createFixture,
  createTable,
  FIXTURE_PRESETS,
  nextTableLabel,
  TABLE_PRESETS,
} from "../../src/model/presets";
import { createSavedFile, parseSavedFile } from "../../src/model/saved-file";

const NOW = new Date("2026-11-24T15:00:00.000Z");
const AT = { xInches: 100.4, yInches: 99.6 };

describe("presets", () => {
  test("every table and fixture they make is a valid part of a saved file", () => {
    const file = createSavedFile(NOW);
    const plan = file.plans[0];
    if (!plan) throw new Error("no plan");
    for (const preset of TABLE_PRESETS)
      plan.tables.push(createTable(preset.id, AT, plan.tables));
    for (const preset of FIXTURE_PRESETS)
      plan.fixtures.push(createFixture(preset.kind, AT));
    const result = parseSavedFile(JSON.stringify(file));
    if (!result.ok) throw new Error(result.reason);
    expect(result.file.plans[0]?.tables).toHaveLength(TABLE_PRESETS.length);
    expect(result.file.plans[0]?.fixtures).toHaveLength(FIXTURE_PRESETS.length);
  });

  test("a new table lands on whole inches, unturned", () => {
    const table = createTable("round-60-inch", AT, []);
    expect(table).toMatchObject({
      xInches: 100,
      yInches: 100,
      rotationDegrees: 0,
      seatCount: 8,
    });
  });

  test("a head table is named for what it is; other tables are numbered", () => {
    expect(createTable("head-table-8-foot", AT, []).label).toBe("Head table");
    expect(createTable("round-72-inch", AT, []).label).toBe("Table 1");
  });
});

describe("nextTableLabel", () => {
  test("takes the number after the highest one in use", () => {
    const tables = [
      createTable("round-60-inch", AT, []),
      { ...createTable("round-60-inch", AT, []), label: "Table 4" },
      createTable("head-table-8-foot", AT, []),
    ];
    expect(nextTableLabel(tables)).toBe("Table 5");
    expect(nextTableLabel([])).toBe("Table 1");
  });
});

describe("changeTableShape", () => {
  test("a rectangle made from a round table keeps its width as its length", () => {
    const round = createTable("round-60-inch", AT, []);
    expect(changeTableShape(round, "rectangle")).toEqual({
      shape: "rectangle",
      depthInches: 30,
      seatSides: "long-sides",
    });
  });

  test("a round or square table is as deep as it is wide", () => {
    const banquet = createTable("banquet-8-foot", AT, []);
    expect(changeTableShape(banquet, "round")).toEqual({
      shape: "round",
      depthInches: 96,
      seatSides: undefined,
    });
    expect(changeTableShape(banquet, "square")).toMatchObject({
      depthInches: 96,
      seatSides: "all-sides",
    });
  });
});
