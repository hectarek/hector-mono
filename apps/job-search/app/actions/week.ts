"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { JobPage } from "@/src/entities/models/job.model";
import type { TodayView } from "@/src/entities/models/today.model";
import type {
  WeeklyReview,
  WeekView,
} from "@/src/entities/models/weekly-review.model";

// This week and the weekly review (docs/build-plan.md U9, R9, R10): get_today, get_week,
// save_weekly_review and list_proposals call these once U4's gate passes.

export async function getToday(
  input: unknown,
): Promise<ActionResult<TodayView>> {
  return answer("getToday", "Couldn't read this week. Try again.", async () =>
    getInjection("IGetTodayController")(input, await getActionActor()),
  );
}

// A week's counts beside its review (R10): get_week.
export async function getWeek(input: unknown): Promise<ActionResult<WeekView>> {
  return answer("getWeek", "Couldn't read the week. Try again.", async () =>
    getInjection("IGetWeekController")(input, await getActionActor()),
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

// The proposals waiting for Hector (R20): find_jobs narrowed to the queue, whatever review state
// the input names.
export async function listProposals(
  input: unknown,
): Promise<ActionResult<JobPage>> {
  return answer(
    "listProposals",
    "Couldn't list the proposals. Try again.",
    async () =>
      getInjection("IFindJobsController")(
        {
          ...(typeof input === "object" && input !== null ? input : {}),
          reviewState: "pending",
        },
        await getActionActor(),
      ),
  );
}
