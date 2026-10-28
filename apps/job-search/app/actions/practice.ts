"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  DeletedPracticeEntry,
  LoggedPractice,
  PracticePage,
} from "@/src/entities/models/practice-entry.model";

// The practice log (docs/build-plan.md U8, R11): list_practice and log_practice call the first two
// once U4's gate passes; deleting a session or a review is Hector's alone (R21).

export async function listPractice(
  input: unknown,
): Promise<ActionResult<PracticePage>> {
  return answer(
    "listPractice",
    "Couldn't list the practice log. Try again.",
    async () =>
      getInjection("IListPracticeController")(input, await getActionActor()),
  );
}

// A session, or a review of one. `tool` is the page tool's name.
export async function logPractice(
  input: unknown,
  tool?: string,
): Promise<ActionResult<LoggedPractice>> {
  return answer(
    "logPractice",
    "Couldn't log the practice. Try again.",
    async () =>
      getInjection("ILogPracticeController")(input, await changeContext(tool)),
    ({ session }) => pagesOf(session.id),
  );
}

export async function deletePracticeEntry(
  input: unknown,
): Promise<ActionResult<DeletedPracticeEntry>> {
  return answer(
    "deletePracticeEntry",
    "Couldn't delete it. Try again.",
    async () =>
      getInjection("IDeletePracticeEntryController")(
        input,
        await changeContext(),
      ),
    ({ sessionId }) => pagesOf(sessionId),
  );
}

// The pages practice shows on: the practice page, the session's page, and Claude's page, which
// lists its changes.
function pagesOf(sessionId: string): string[] {
  return ["/practice", `/practice/${sessionId}`, "/agent"];
}
