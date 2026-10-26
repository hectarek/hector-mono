"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import {
  type ActionResult,
  actionLogger,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { ActivityPage } from "@/src/entities/models/activity.model";

// The owner's changes, newest first, narrowed by record, actor and time, a page at a time (R19):
// list_activity calls this once U4's gate passes (docs/build-plan.md U5).
export async function listActivity(
  input: unknown,
): Promise<ActionResult<ActivityPage>> {
  try {
    return succeeded(
      await getInjection("IListActivityController")(
        input,
        await getActionActor(),
      ),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("listActivity"),
      "Couldn't list the changes. Try again.",
    );
  }
}
