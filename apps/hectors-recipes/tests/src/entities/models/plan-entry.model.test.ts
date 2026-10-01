import { describe, expect, it } from "bun:test";
import { addPlanEntrySchema } from "@/src/entities/models/plan-entry.model";
import { MONDAY } from "@/tests/_support/app";

describe("addPlanEntrySchema", () => {
  const spaceId = "00000000-0000-4000-8000-0000000000aa";
  const recipeId = "00000000-0000-4000-8000-0000000000bb";
  const parse = (input: object) =>
    addPlanEntrySchema.safeParse({ spaceId, recipeId, ...input });

  it("needs a recipe, a real cook day and at least one eat day, none before it", () => {
    expect(
      addPlanEntrySchema.safeParse({
        spaceId,
        cookDate: MONDAY,
        eatDates: [MONDAY],
      }).success,
    ).toBe(false);
    expect(parse({ cookDate: "2026-02-30", eatDates: [MONDAY] }).success).toBe(
      false,
    );
    expect(parse({ cookDate: MONDAY, eatDates: [] }).success).toBe(false);
    expect(parse({ cookDate: MONDAY, eatDates: ["2026-09-20"] }).success).toBe(
      false,
    );
    // Sunday meal prep, eaten through the week without the cook day.
    expect(
      parse({ cookDate: "2026-09-20", eatDates: [MONDAY, "2026-09-23"] })
        .success,
    ).toBe(true);
  });

  it("keeps eat days sorted and once each", () => {
    expect(
      parse({
        cookDate: MONDAY,
        eatDates: ["2026-09-23", MONDAY, "2026-09-23"],
      }).data?.eatDates,
    ).toEqual([MONDAY, "2026-09-23"]);
  });
});
