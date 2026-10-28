import { addDays } from "./week";

// How a try at a problem or topic went (R11). A partial result counts as a failed one for
// scheduling (docs/build-plan.md U8).
export const PRACTICE_RESULTS = ["solved", "partial", "failed"] as const;
export type PracticeResult = (typeof PRACTICE_RESULTS)[number];

// The ladder's steps: a session's first, second and third review. A problem is done once its
// third review is solved.
export type ReviewStep = 1 | 2 | 3;
export const LADDER_STEPS = 3;

// Days from the try before a step's review to the review: 2 after the session, 7 after a solved
// first review, 21 after a solved second one (R11).
const GAP_DAYS: Record<ReviewStep, number> = { 1: 2, 2: 7, 3: 21 };

// A failed or partial review is tried again this many days later, on the same step (R11).
const RETRY_DAYS = 2;

// The review a session waits on: its step and the day it's due, "YYYY-MM-DD" in Eastern time.
export type NextReview = { step: ReviewStep; dueOn: string };

// A try as the ladder reads it: when it happened and how it went.
type Try = { practicedOn: string; result: PracticeResult };

// The review that follows a session's tries, replayed from the session through its reviews in the
// order they happened, so a deleted review takes its effect with it. One review is scheduled at a
// time. The first comes 2 days after the session whatever its result, as the sheet's formula has
// it, and null means the third review was solved.
export function nextReview(
  session: Try & { reviews: readonly Try[] },
): NextReview | null {
  let next: NextReview | null = {
    step: 1,
    dueOn: addDays(session.practicedOn, GAP_DAYS[1]),
  };
  for (const { practicedOn, result } of session.reviews) {
    if (!next) {
      break;
    }
    if (result !== "solved") {
      next = { step: next.step, dueOn: addDays(practicedOn, RETRY_DAYS) };
      continue;
    }
    const following = stepAfter(next.step);
    next = following && {
      step: following,
      dueOn: addDays(practicedOn, GAP_DAYS[following]),
    };
  }
  return next;
}

// The step each of a session's reviews was on, in the order they happened: a solved one moves the
// next up a step, and a failed or partial one leaves it where it was.
export function reviewSteps(reviews: readonly Try[]): ReviewStep[] {
  let step: ReviewStep = 1;
  return reviews.map(({ result }) => {
    const on = step;
    if (result === "solved") {
      step = stepAfter(step) ?? step;
    }
    return on;
  });
}

// The step after a solved review on `step`, or null after the last.
function stepAfter(step: ReviewStep): ReviewStep | null {
  if (step === LADDER_STEPS) {
    return null;
  }
  return step === 1 ? 2 : 3;
}
