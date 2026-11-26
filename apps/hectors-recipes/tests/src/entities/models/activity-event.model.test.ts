import { describe, expect, it } from "bun:test";
import {
  type ActivityEvent,
  isActivityType,
  isRepeat,
  newActivity,
} from "@/src/entities/models/activity-event.model";
import { OWNER, PARTNER } from "@/tests/_support/app";

const RECIPE = "00000000-0000-4000-8000-00000000000a";
const OTHER = "00000000-0000-4000-8000-00000000000b";
const MINUTE = 60 * 1000;

// D106: what people do, recorded as events of a known kind.
describe("newActivity", () => {
  it("fills in what it isn't about", () => {
    expect(
      newActivity("recipe-viewed", OWNER, { recipeId: RECIPE }, {}),
    ).toEqual({
      type: "recipe-viewed",
      userId: OWNER,
      recipeId: RECIPE,
      spaceId: null,
      details: {},
    });
  });
});

describe("isRepeat", () => {
  const at = new Date("2026-11-26T12:00:00Z");
  const viewed = (recipeId: string, minutesAgo: number): ActivityEvent => ({
    ...newActivity("recipe-viewed", OWNER, { recipeId }, {}),
    id: "e1",
    occurredAt: new Date(at.getTime() - minutesAgo * MINUTE),
  });
  const next = newActivity("recipe-viewed", OWNER, { recipeId: RECIPE }, {});

  it("is the same view when the latest one was this recipe, within 10 minutes", () => {
    expect(isRepeat(viewed(RECIPE, 3), next, at)).toBe(true);
  });

  it("counts again after 10 minutes, after another recipe, or the first time", () => {
    expect(isRepeat(viewed(RECIPE, 10), next, at)).toBe(false);
    expect(isRepeat(viewed(OTHER, 1), next, at)).toBe(false);
    expect(isRepeat(null, next, at)).toBe(false);
  });

  it("never repeats someone else's", () => {
    const theirs = { ...viewed(RECIPE, 1), userId: PARTNER };
    expect(isRepeat(theirs, next, at)).toBe(false);
  });
});

describe("isActivityType", () => {
  it("knows the kinds in the code, and no others", () => {
    expect(isActivityType("recipe-viewed")).toBe(true);
    expect(isActivityType("retired-kind")).toBe(false);
    expect(isActivityType("toString")).toBe(false);
  });
});
