"use server";

import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { AddedSource } from "@/src/entities/models/lead-source.model";

// Lead sources (docs/build-plan.md U5): add_source calls this once U4's gate passes.

// Adds a source, or answers with the one already listed under the name in any case. `tool` is
// the page tool's name.
export async function addSource(
  input: unknown,
  tool?: string,
): Promise<ActionResult<AddedSource>> {
  return answer(
    "addSource",
    "Couldn't add the source. Try again.",
    async () =>
      getInjection("IAddSourceController")(input, await changeContext(tool)),
    // The settings page lists the sources, and Claude's page its changes.
    (added) => (added.created ? ["/settings", "/agent"] : []),
  );
}
