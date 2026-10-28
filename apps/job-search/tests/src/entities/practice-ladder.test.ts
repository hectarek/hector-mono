import { describe, expect, it } from "bun:test";
import {
  nextReview,
  type PracticeResult,
  reviewSteps,
} from "@/src/entities/practice-ladder";

type Try = { practicedOn: string; result: PracticeResult };

const solved = (practicedOn: string): Try => ({
  practicedOn,
  result: "solved",
});
const failed = (practicedOn: string): Try => ({
  practicedOn,
  result: "failed",
});
const partial = (practicedOn: string): Try => ({
  practicedOn,
  result: "partial",
});

// A session on Monday, Oct 26, 2026, and its reviews.
const session = (reviews: Try[], result: PracticeResult = "solved") => ({
  practicedOn: "2026-10-26",
  result,
  reviews,
});

describe("the review ladder (R11)", () => {
  it("schedules a solved session's first review 2 days after it", () => {
    expect(nextReview(session([]))).toEqual({ step: 1, dueOn: "2026-10-28" });
  });

  it("schedules a failed or partial session's first review 2 days after it too, as the sheet's formula does", () => {
    expect(nextReview(session([], "failed"))).toEqual({
      step: 1,
      dueOn: "2026-10-28",
    });
    expect(nextReview(session([], "partial"))).toEqual({
      step: 1,
      dueOn: "2026-10-28",
    });
  });

  it("moves up a step after each solved review: 7 days after the first, 21 after the second, and none after the third", () => {
    expect(nextReview(session([solved("2026-10-28")]))).toEqual({
      step: 2,
      dueOn: "2026-11-04",
    });
    expect(
      nextReview(session([solved("2026-10-28"), solved("2026-11-04")])),
    ).toEqual({ step: 3, dueOn: "2026-11-25" });
    expect(
      nextReview(
        session([
          solved("2026-10-28"),
          solved("2026-11-04"),
          solved("2026-11-25"),
        ]),
      ),
    ).toBeNull();
  });

  it("retries a failed or partial review 2 days later on the same step", () => {
    const reviews = [solved("2026-10-28"), failed("2026-11-04")];
    expect(nextReview(session(reviews))).toEqual({
      step: 2,
      dueOn: "2026-11-06",
    });

    reviews.push(partial("2026-11-06"));
    expect(nextReview(session(reviews))).toEqual({
      step: 2,
      dueOn: "2026-11-08",
    });

    reviews.push(solved("2026-11-08"));
    expect(nextReview(session(reviews))).toEqual({
      step: 3,
      dueOn: "2026-11-29",
    });
  });

  it("counts calendar days across a year's end", () => {
    expect(
      nextReview({ practicedOn: "2026-12-30", result: "solved", reviews: [] }),
    ).toEqual({ step: 1, dueOn: "2027-01-01" });
  });

  it("numbers each review by the step it was on", () => {
    expect(
      reviewSteps([
        solved("2026-10-28"),
        failed("2026-11-04"),
        solved("2026-11-06"),
        solved("2026-11-27"),
      ]),
    ).toEqual([1, 2, 2, 3]);
  });
});
