"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  SessionStart,
  WhoAmI,
} from "@/src/entities/models/agent-session.model";

// Claude's session tools (docs/build-plan.md U4): plain-argument actions that answer an envelope
// and never redirect (KTD4). The page tools call them (app/_lib/agent-tools/registry.ts).

// Who the session acts as, today's date in Eastern time and the tool set's version.
export async function whoami(input: unknown): Promise<ActionResult<WhoAmI>> {
  return answer(
    "whoami",
    "Couldn't tell who's signed in. Try again.",
    async () =>
      getInjection("IWhoamiController")(input, await getActionActor()),
  );
}

// Logs the start of a working session, and answers with the changes since the previous one
// started (F1). `tool` is the page tool's name.
export async function startSession(
  input: unknown,
  tool?: string,
): Promise<ActionResult<SessionStart>> {
  return answer(
    "startSession",
    "Couldn't start the session. Try again.",
    async () =>
      getInjection("IStartSessionController")(input, await changeContext(tool)),
    // Claude's page lists its sessions.
    () => ["/agent"],
  );
}
