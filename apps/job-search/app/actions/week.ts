"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { JobPage } from "@/src/entities/models/job.model";
import type { TodayView } from "@/src/entities/models/today.model";

// This week (docs/build-plan.md U9, R9): get_today and list_proposals call these once U4's gate
// passes.

export async function getToday(
  input: unknown,
): Promise<ActionResult<TodayView>> {
  return answer("getToday", "Couldn't read this week. Try again.", async () =>
    getInjection("IGetTodayController")(input, await getActionActor()),
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
