import { describe, expect, test } from "bun:test";
import {
  formatFeet,
  freeSpot,
  itemBounds,
  rotate,
  seatPositions,
  seatsPerSide,
  snapToGrid,
} from "../../src/model/geometry";
import { createFixture, createTable } from "../../src/model/presets";

const AT = { xInches: 120, yInches: 120 };

function closeTo(point: { x: number; y: number }, x: number, y: number) {
  expect(point.x).toBeCloseTo(x, 6);
  expect(point.y).toBeCloseTo(y, 6);
}

describe("rotate", () => {
  test("a positive angle turns clockwise on screen, where y points down", () => {
    closeTo(rotate({ x: 10, y: 0 }, 90), 0, 10);
    closeTo(rotate({ x: 0, y: -10 }, 90), 10, 0);
  });
});

describe("snapToGrid", () => {
  test("rounds to the nearest grid line", () => {
    expect(snapToGrid(17, 12)).toBe(12);
    expect(snapToGrid(19, 12)).toBe(24);
  });
});

describe("seatsPerSide", () => {
  test("one side puts every seat on the top side", () => {
    const head = createTable("head-table-8-foot", AT, []);
    expect(seatsPerSide(head)).toEqual({
      top: 4,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  test("long sides split an odd count with the extra seat on top", () => {
    const banquet = { ...createTable("banquet-8-foot", AT, []), seatCount: 7 };
    expect(seatsPerSide(banquet)).toEqual({
      top: 4,
      right: 0,
      bottom: 3,
      left: 0,
    });
  });

  test("all sides share seats by side length", () => {
    expect(seatsPerSide(createTable("square-60-inch", AT, []))).toEqual({
      top: 2,
      right: 2,
      bottom: 2,
      left: 2,
    });
    const eightFoot = {
      ...createTable("banquet-8-foot", AT, []),
      seatSides: "all-sides" as const,
      seatCount: 10,
    };
    expect(seatsPerSide(eightFoot)).toEqual({
      top: 4,
      right: 1,
      bottom: 4,
      left: 1,
    });
    const sixFoot = {
      ...createTable("banquet-6-foot", AT, []),
      seatSides: "all-sides" as const,
      seatCount: 8,
    };
    expect(seatsPerSide(sixFoot)).toEqual({
      top: 3,
      right: 1,
      bottom: 3,
      left: 1,
    });
  });
});

describe("seatPositions", () => {
  test("a round table's seats ring it, seat 0 at the top, going clockwise", () => {
    const seats = seatPositions(createTable("round-60-inch", AT, []));
    expect(seats).toHaveLength(8);
    // 30 inches of table plus 12 to the seat's center.
    closeTo(seats[0] ?? { x: Number.NaN, y: Number.NaN }, 120, 78);
    closeTo(seats[2] ?? { x: Number.NaN, y: Number.NaN }, 162, 120);
    closeTo(seats[4] ?? { x: Number.NaN, y: Number.NaN }, 120, 162);
  });

  test("a rectangle's seats start at the top side's left end and go clockwise", () => {
    const seats = seatPositions(createTable("banquet-6-foot", AT, []));
    // 72 by 30 inches: three seats above at x 96, 120, 144, then three below from the right.
    expect(seats.map((s) => [Math.round(s.x), Math.round(s.y)])).toEqual([
      [96, 93],
      [120, 93],
      [144, 93],
      [144, 147],
      [120, 147],
      [96, 147],
    ]);
  });

  test("seats turn with the table", () => {
    const head = {
      ...createTable("head-table-8-foot", AT, []),
      rotationDegrees: 90,
    };
    // Turned a quarter clockwise, the top side faces right.
    for (const seat of seatPositions(head))
      expect(seat.x).toBeCloseTo(120 + 27, 6);
  });
});

describe("itemBounds", () => {
  test("a table's box includes its chairs", () => {
    const bounds = itemBounds(createTable("round-60-inch", AT, []));
    // 30 inches of table, 12 to the seat's center and 9 for half a chair.
    expect(bounds).toEqual({ left: 69, top: 69, right: 171, bottom: 171 });
  });

  test("a fixture's box turns with it", () => {
    const bar = { ...createFixture("bar", AT), rotationDegrees: 90 };
    const bounds = itemBounds(bar);
    expect(bounds.right - bounds.left).toBeCloseTo(36, 6);
    expect(bounds.bottom - bounds.top).toBeCloseTo(96, 6);
  });
});

describe("formatFeet", () => {
  test("writes feet and inches the way a floor plan does", () => {
    expect(formatFeet(66)).toBe("5′ 6″");
    expect(formatFeet(720)).toBe("60′");
    expect(formatFeet(8)).toBe("8″");
  });
});

describe("freeSpot", () => {
  const ROOM = { widthInches: 720, lengthInches: 480, gridInches: 12 };

  test("keeps a spot nothing covers", () => {
    const table = createTable(
      "round-60-inch",
      { xInches: 360, yInches: 240 },
      [],
    );
    expect(freeSpot(table, [], ROOM)).toEqual({ xInches: 360, yInches: 240 });
  });

  test("moves a new table clear of one already there, to its right first", () => {
    const first = createTable(
      "round-60-inch",
      { xInches: 360, yInches: 240 },
      [],
    );
    const second = createTable(
      "round-60-inch",
      { xInches: 360, yInches: 240 },
      [first],
    );
    const spot = freeSpot(second, [first], ROOM);
    expect(spot.yInches).toBe(240);
    expect(spot.xInches).toBeGreaterThan(360);
    const a = itemBounds(first);
    const b = itemBounds({ ...second, ...spot });
    expect(b.left).toBeGreaterThanOrEqual(a.right);
  });

  test("prefers a clear spot inside the room over one outside it", () => {
    const wall = createTable(
      "round-60-inch",
      { xInches: 690, yInches: 240 },
      [],
    );
    const next = createTable("round-60-inch", { xInches: 690, yInches: 240 }, [
      wall,
    ]);
    const spot = freeSpot(next, [wall], ROOM);
    const bounds = itemBounds({ ...next, ...spot });
    expect(bounds.right).toBeLessThanOrEqual(720);
  });
});
