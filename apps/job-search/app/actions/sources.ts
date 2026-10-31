"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  AddedSource,
  LeadSource,
} from "@/src/entities/models/lead-source.model";

// Lead sources (docs/build-plan.md U5): the add_source and list_sources page tools call these.

// The sources listed, by name, so Claude names a job's source from them rather than adding a
// near-miss (U6's review).
export async function listSources(
  input: unknown,
): Promise<ActionResult<LeadSource[]>> {
  return answer(
    "listSources",
    "Couldn't list the sources. Try again.",
    async () =>
      getInjection("IListSourcesController")(input, await getActionActor()),
  );
}

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
