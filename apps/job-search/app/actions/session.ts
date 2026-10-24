"use server";

import { revalidatePath } from "next/cache";
import { getActionActor } from "@/app/_lib/current-actor";
import {
  type ActionResult,
  actionLogger,
  changeContext,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  SessionStart,
  WhoAmI,
} from "@/src/entities/models/agent-session.model";

// Claude's session tools (docs/build-plan.md U4): plain-argument actions that answer an envelope
// and never redirect (KTD4). The page tools call them (app/_lib/agent-tools/registry.ts).

// Who the session acts as, today's date in Eastern time and the tool set's version.
export async function whoami(input: unknown): Promise<ActionResult<WhoAmI>> {
  try {
    return succeeded(
      await getInjection("IWhoamiController")(input, await getActionActor()),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("whoami"),
      "Couldn't tell who's signed in. Try again.",
    );
  }
}

// Logs the start of a working session, and answers with the changes since the previous one
// started (F1). `tool` is the page tool's name.
export async function startSession(
  input: unknown,
  tool?: string,
): Promise<ActionResult<SessionStart>> {
  let started: SessionStart;
  try {
    started = await getInjection("IStartSessionController")(
      input,
      await changeContext(tool),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("startSession"),
      "Couldn't start the session. Try again.",
    );
  }
  // Claude's page lists its sessions.
  revalidatePath("/agent");
  return succeeded(started);
}
