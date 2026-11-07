import { addDays } from "@/src/entities/week";

// How long a next step given no date waits: a week (the UX plan's Q1).
const NEXT_STEP_DAYS = 7;

type Step = { nextStep: string | null; nextDate: string | null };
type StepChange = { nextStep?: string | null; nextDate?: string | null };

// A next step always carries a date (R1 and R7 as revised 2026-11-07, the UX plan's Q1): a write
// that leaves a step without one dates it a week from today. A write that sets neither the step nor
// the date leaves them alone, so an edit elsewhere never dates an old step. A step for someday is no
// next step, with a note.
export function withStepDate<T extends StepChange>(
  change: T,
  current: Step,
  today: string,
): T & Pick<StepChange, "nextDate"> {
  if (change.nextStep === undefined && change.nextDate === undefined) {
    return change;
  }
  const step =
    change.nextStep === undefined ? current.nextStep : change.nextStep;
  const date =
    change.nextDate === undefined ? current.nextDate : change.nextDate;
  return step && !date
    ? { ...change, nextDate: addDays(today, NEXT_STEP_DAYS) }
    : change;
}

// What a new record's step is measured against: nothing yet.
export const NO_STEP: Step = { nextStep: null, nextDate: null };
