"use server";

import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  Interaction,
  LoggedInteractions,
} from "@/src/entities/models/interaction.model";

// The dated outreach log (docs/build-plan.md U7, KTD9): log_interaction calls the first once U4's
// gate passes; deleting an interaction is Hector's alone (R21).

// `tool` is the page tool's name.
export async function logInteraction(
  input: unknown,
  tool?: string,
): Promise<ActionResult<LoggedInteractions>> {
  return answer(
    "logInteraction",
    "Couldn't log it. Try again.",
    async () =>
      getInjection("ILogInteractionController")(
        input,
        await changeContext(tool),
      ),
    ({ interactions }) => pagesOf(interactions),
  );
}

export async function deleteInteraction(
  input: unknown,
): Promise<ActionResult<Interaction>> {
  return answer(
    "deleteInteraction",
    "Couldn't delete it. Try again.",
    async () =>
      getInjection("IDeleteInteractionController")(
        input,
        await changeContext(),
      ),
    (interaction) => pagesOf([interaction]),
  );
}

// The pages an interaction shows on: the people list (their dates), its person's page, its job's
// page and the jobs list (a follow-up moves), and Claude's page, which lists its changes.
function pagesOf(interactions: Interaction[]): string[] {
  const pages = new Set(["/people"]);
  for (const { personId, jobId } of interactions) {
    pages.add(`/people/${personId}`);
    if (jobId) {
      pages.add("/jobs");
      pages.add(`/jobs/${jobId}`);
    }
  }
  pages.add("/agent");
  return [...pages];
}
