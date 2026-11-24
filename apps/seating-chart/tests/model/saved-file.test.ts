import { describe, expect, test } from "bun:test";
import { createTable } from "../../src/model/presets";
import {
  createSavedFile,
  needsExportReminder,
  parseSavedFile,
  prepareExport,
  type SavedFile,
} from "../../src/model/saved-file";

const NOW = new Date("2026-11-24T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function withOneTableAndGuests(): SavedFile {
  const file = createSavedFile(NOW);
  const [plan] = file.plans;
  if (!plan) throw new Error("createSavedFile made no plan");
  const table = createTable(
    "round-60-inch",
    { xInches: 120, yInches: 120 },
    [],
  );
  plan.tables.push(table);
  plan.guests.push(
    {
      id: "g1",
      name: "Ana Ruiz",
      group: "Neighbors",
      tableId: table.id,
      seatIndex: 2,
    },
    { id: "g2", name: "Leo Park" },
  );
  return file;
}

describe("parseSavedFile", () => {
  test("reads back what the app writes", () => {
    const file = withOneTableAndGuests();
    const result = parseSavedFile(JSON.stringify(file));
    expect(result).toEqual({ ok: true, file });
  });

  test("refuses text that isn't JSON", () => {
    expect(parseSavedFile("{not json")).toEqual({
      ok: false,
      reason: "The text isn't JSON.",
    });
  });

  test("refuses JSON with no version number", () => {
    const result = parseSavedFile(JSON.stringify({ plans: [] }));
    expect(result.ok).toBe(false);
  });

  test("refuses a file from a newer version of the app, and says so", () => {
    const result = parseSavedFile(
      JSON.stringify({ ...createSavedFile(NOW), version: 2 }),
    );
    expect(result).toEqual({
      ok: false,
      reason: "It comes from a newer version of the app (file version 2).",
    });
  });

  test("refuses a table with no seats", () => {
    const file = withOneTableAndGuests();
    const table = file.plans[0]?.tables[0];
    if (!table) throw new Error("no table");
    table.seatCount = 0;
    const result = parseSavedFile(JSON.stringify(file));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("doesn't match");
  });

  test("refuses a file whose active plan isn't in it", () => {
    const file = { ...createSavedFile(NOW), activePlanId: "missing" };
    expect(parseSavedFile(JSON.stringify(file)).ok).toBe(false);
  });

  test("unseats a guest whose table is gone", () => {
    const file = withOneTableAndGuests();
    const guest = file.plans[0]?.guests[0];
    if (!guest) throw new Error("no guest");
    guest.tableId = "deleted-table";
    const result = parseSavedFile(JSON.stringify(file));
    if (!result.ok) throw new Error(result.reason);
    const read = result.file.plans[0]?.guests[0];
    expect(read?.tableId).toBeUndefined();
    expect(read?.seatIndex).toBeUndefined();
    expect(read?.name).toBe("Ana Ruiz");
  });

  test("keeps the table but drops a seat number the table doesn't have", () => {
    const file = withOneTableAndGuests();
    const guest = file.plans[0]?.guests[0];
    if (!guest) throw new Error("no guest");
    guest.seatIndex = 8;
    const result = parseSavedFile(JSON.stringify(file));
    if (!result.ok) throw new Error(result.reason);
    const read = result.file.plans[0]?.guests[0];
    expect(read?.tableId).toBe(file.plans[0]?.tables[0]?.id);
    expect(read?.seatIndex).toBeUndefined();
  });
});

describe("prepareExport", () => {
  test("names the file after the plan and the day, and records the export time", () => {
    const later = new Date(NOW.getTime() + 2 * DAY);
    const exported = prepareExport(withOneTableAndGuests(), later);
    expect(exported.fileName).toBe(
      "seating-chart-reception-plan-2026-11-26.json",
    );
    expect(exported.file.lastExportedAt).toBe(later.toISOString());
    expect(parseSavedFile(exported.text)).toEqual({
      ok: true,
      file: exported.file,
    });
  });
});

describe("needsExportReminder", () => {
  test("never asks about an empty plan", () => {
    expect(
      needsExportReminder(
        createSavedFile(NOW),
        new Date(NOW.getTime() + 30 * DAY),
      ),
    ).toBe(false);
  });

  test("asks once a plan with something in it is more than a week from its last export", () => {
    const file = withOneTableAndGuests();
    expect(needsExportReminder(file, new Date(NOW.getTime() + 6 * DAY))).toBe(
      false,
    );
    expect(needsExportReminder(file, new Date(NOW.getTime() + 8 * DAY))).toBe(
      true,
    );

    const exported = prepareExport(
      file,
      new Date(NOW.getTime() + 8 * DAY),
    ).file;
    expect(
      needsExportReminder(exported, new Date(NOW.getTime() + 9 * DAY)),
    ).toBe(false);
  });
});
