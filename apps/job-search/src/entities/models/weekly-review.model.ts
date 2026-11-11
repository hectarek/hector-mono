import { z } from "zod";
import { mondayOf } from "../week";
import type { WeeklyCounts } from "../weekly-counts";
import type { ChangeActor } from "./activity.model";
import { dateSchema, optionalText, timeSchema } from "./input.model";
import type { Settings } from "./settings.model";

// A week's review (R10, U9): the week's counts and targets as they stood at its first save, fixed
// from then on, and the one change, which stays editable. One per owner and week, keyed by the
// week's Monday. The week's milestone is its plan's (WeekPlan).
export type WeeklyReview = {
  id: string;
  // The week's Monday, "YYYY-MM-DD".
  week: string;
  counts: WeeklyCounts;
  targets: Settings["targets"];
  change: string | null;
  author: ChangeActor;
  createdAt: Date;
  updatedAt: Date;
};

// The review's facts, as its history logs them.
export function weeklyReviewLogged({
  counts,
  targets,
  change,
}: Pick<WeeklyReview, "counts" | "targets" | "change">): Record<
  string,
  unknown
> {
  return { counts, targets, change };
}

// A week's plan (R10 as revised 2026-11-10, U20): the milestone Monday's planning sets, which
// fixes no counts or targets. One per owner and week, keyed by the week's Monday; a cleared
// milestone is null.
export type WeekPlan = {
  id: string;
  // The week's Monday, "YYYY-MM-DD".
  week: string;
  milestone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// A week goes by its Monday.
const mondaySchema = dateSchema.refine((day) => mondayOf(day) === day, {
  error: "Use the week's Monday",
});

// get_week's input: the week, by its Monday; this week when not given.
export const getWeekSchema = z.object({ week: mondaySchema.optional() });
export type WeekQuery = z.output<typeof getWeekSchema>;

// save_weekly_review's input: the week and its one change, against the updatedAt read with its
// review (null when none was saved yet). The first save fixes the week's counts and targets as
// they are then; a later one changes only the change.
export const saveWeeklyReviewSchema = z.object({
  week: mondaySchema,
  change: optionalText(500).optional(),
  updatedAt: timeSchema.nullable(),
});
export type SaveWeeklyReviewInput = z.output<typeof saveWeeklyReviewSchema>;

// set_week_milestone's input: the week and its milestone (blank or null clears it), against the
// updatedAt read with its plan (null when none was set yet).
export const setWeekMilestoneSchema = z.object({
  week: mondaySchema,
  milestone: optionalText(200),
  updatedAt: timeSchema.nullable(),
});
export type SetWeekMilestoneInput = z.output<typeof setWeekMilestoneSchema>;

// What the week page and get_week show (R10): the week, its counts now and today's targets, its
// plan, the review saved for it, if any, whose snapshot the live counts may no longer match, and
// the weeks before and after it (none after this week).
export type WeekView = {
  week: string;
  counts: WeeklyCounts;
  targets: Settings["targets"];
  plan: WeekPlan | null;
  review: WeeklyReview | null;
  previous: string;
  next: string | null;
};
