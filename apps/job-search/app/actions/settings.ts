"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Settings } from "@/src/entities/models/settings.model";

// Hector's settings (docs/build-plan.md U5): get_settings reads them, so Claude sees the targets
// and the queue's cap the settings page shows (U10).
export async function getSettings(
  input: unknown,
): Promise<ActionResult<Settings>> {
  return answer(
    "getSettings",
    "Couldn't read the settings. Try again.",
    async () =>
      getInjection("IGetSettingsController")(input, await getActionActor()),
  );
}

// Changing them is Hector's alone (R21): no page tool calls this.
export async function updateSettings(
  input: unknown,
): Promise<ActionResult<Settings>> {
  return answer(
    "updateSettings",
    "Couldn't save the settings. Try again.",
    async () =>
      getInjection("IUpdateSettingsController")(input, await changeContext()),
    () => ["/", "/settings"],
  );
}
