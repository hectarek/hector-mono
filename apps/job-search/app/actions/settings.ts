"use server";

import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Settings } from "@/src/entities/models/settings.model";

// Hector's settings (docs/build-plan.md U5), which only he changes (R21): no page tool calls this.
export async function updateSettings(
  input: unknown,
): Promise<ActionResult<Settings>> {
  return answer(
    "updateSettings",
    "Couldn't save the settings. Try again.",
    async () =>
      getInjection("IUpdateSettingsController")(input, await changeContext()),
    () => ["/settings"],
  );
}
