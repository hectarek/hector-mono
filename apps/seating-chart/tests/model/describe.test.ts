import { describe, expect, test } from "bun:test";
import { describeItem, listOrder } from "../../src/model/describe";
import { createFixture, createTable } from "../../src/model/presets";

const AT = { xInches: 0, yInches: 0 };

describe("describeItem", () => {
  test("names a table, its shape and size, and how full it is", () => {
    const round = { ...createTable("round-60-inch", AT, []), label: "Table 4" };
    expect(describeItem(round, 5)).toBe(
      "Table 4, round 60 inches, 5 of 8 seats filled",
    );
    const banquet = {
      ...createTable("banquet-8-foot", AT, []),
      label: "Table 9",
    };
    expect(describeItem(banquet, 0)).toBe(
      "Table 9, rectangle 96 by 30 inches, 0 of 8 seats filled",
    );
  });

  test("names a shape and its size in feet", () => {
    expect(describeItem(createFixture("dance-floor", AT), 0)).toBe(
      "Dance floor, 16′ by 16′",
    );
    expect(describeItem(createFixture("pillar", AT), 0)).toBe(
      "Pillar, 2′ across",
    );
  });
});

describe("listOrder", () => {
  test("puts numbered tables in number order, then named tables, then shapes", () => {
    const t10 = { ...createTable("round-60-inch", AT, []), label: "Table 10" };
    const t2 = { ...createTable("round-60-inch", AT, []), label: "Table 2" };
    const head = createTable("head-table-8-foot", AT, []);
    const bar = createFixture("bar", AT);
    const order = listOrder({ tables: [t10, head, t2], fixtures: [bar] }).map(
      (i) => i.label,
    );
    expect(order).toEqual(["Table 2", "Table 10", "Head table", "Bar"]);
  });
});
