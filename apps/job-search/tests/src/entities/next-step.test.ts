import { describe, expect, it } from "bun:test";
import { NO_STEP, withStepDate } from "@/src/entities/next-step";

const TODAY = "2026-11-07";
const UNDATED = { nextStep: "Call back", nextDate: null };

// A change as the use cases pass one: some of a record's facts, the step and date among them.
type Change = {
  role?: string;
  nextStep?: string | null;
  nextDate?: string | null;
};
const change = (facts: Change) => facts;

// R1 and R7 as revised 2026-11-07 (the UX plan's Q1): a next step always carries a date.
describe("a next step's date", () => {
  it("is a week out when a write gives a step and no date", () => {
    expect(
      withStepDate(change({ nextStep: "Call back" }), NO_STEP, TODAY),
    ).toEqual({
      nextStep: "Call back",
      nextDate: "2026-11-14",
    });
  });

  it("is a week out when a write clears the date of a step it keeps", () => {
    expect(
      withStepDate(
        change({ nextDate: null }),
        { nextStep: "Call back", nextDate: "2026-11-09" },
        TODAY,
      ),
    ).toEqual({ nextDate: "2026-11-14" });
  });

  it("is the one given, when a write gives one", () => {
    expect(
      withStepDate(
        change({ nextStep: "Call back", nextDate: "2026-11-09" }),
        NO_STEP,
        TODAY,
      ),
    ).toEqual({ nextStep: "Call back", nextDate: "2026-11-09" });
  });

  it("is left alone by a write that sets neither the step nor the date", () => {
    expect(withStepDate(change({ role: "Analyst" }), UNDATED, TODAY)).toEqual({
      role: "Analyst",
    });
  });

  it("stays empty when the step is cleared too", () => {
    expect(
      withStepDate(change({ nextStep: null, nextDate: null }), UNDATED, TODAY),
    ).toEqual({ nextStep: null, nextDate: null });
  });
});
