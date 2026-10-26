"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  actionLogger,
  changeContext,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Settings } from "@/src/entities/models/settings.model";

// Hector's settings (docs/build-plan.md U5), which only he changes (R21): no page tool calls this.
export async function updateSettings(
  input: unknown,
): Promise<ActionResult<Settings>> {
  let saved: Settings;
  try {
    saved = await getInjection("IUpdateSettingsController")(
      input,
      await changeContext(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("updateSettings"),
      "Couldn't save the settings. Try again.",
    );
  }
  revalidatePath("/settings");
  return succeeded(saved);
}
