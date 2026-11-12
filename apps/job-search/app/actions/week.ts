"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { TodayView } from "@/src/entities/models/today.model";
import type {
  WeeklyReview,
  WeekPlan,
  WeekView,
} from "@/src/entities/models/weekly-review.model";

// Today, the week's plan and the weekly review (docs/build-plan.md U9 and U20, R9, R10):
// get_today, get_week, set_week_milestone and save_weekly_review call these.

export async function getToday(
  input: unknown,
): Promise<ActionResult<TodayView>> {
  return answer("getToday", "Couldn't read Today. Try again.", async () =>
    getInjection("IGetTodayController")(input, await getActionActor()),
  );
}

// A week's counts beside its review (R10): get_week.
export async function getWeek(input: unknown): Promise<ActionResult<WeekView>> {
  return answer("getWeek", "Couldn't read the week. Try again.", async () =>
    getInjection("IGetWeekController")(input, await getActionActor()),
  );
}

// A week's milestone, Hector's or Claude's, set at Monday's planning (R10 as revised 2026-11-10).
// `tool` is the page tool's name.
export async function setWeekMilestone(
  input: unknown,
  tool?: string,
): Promise<ActionResult<WeekPlan>> {
  return answer(
    "setWeekMilestone",
    "Couldn't save the milestone. Try again.",
    async () =>
      getInjection("ISetWeekMilestoneController")(
        input,
        await changeContext(tool),
      ),
    (plan) => ["/", "/week", `/week?week=${plan.week}`, "/agent"],
  );
}

// A week's review, Hector's or Claude's (R10). `tool` is the page tool's name.
export async function saveWeeklyReview(
  input: unknown,
  tool?: string,
): Promise<ActionResult<WeeklyReview>> {
  return answer(
    "saveWeeklyReview",
    "Couldn't save the review. Try again.",
    async () =>
      getInjection("ISaveWeeklyReviewController")(
        input,
        await changeContext(tool),
      ),
    (review) => ["/", "/week", `/week?week=${review.week}`, "/agent"],
  );
}
