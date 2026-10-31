import { z } from "zod";
import { type ActivityEntry, listActivitySchema } from "./activity.model";
import type { Actor } from "./actor.model";

// The version of Claude's page tools (app/_lib/agent-tools/registry.ts), which whoami reports.
// Bump it when a tool is added or removed, or its input or what it does changes, so a session can
// tell that what it knows about the tools is out of date (docs/build-plan.md KTD5).
export const TOOL_SET_VERSION = 3;

// whoami takes nothing.
export const whoamiSchema = z.object({});

// Who a session acts as, today's date in Eastern time ("YYYY-MM-DD", KTD18) and the tool set's
// version.
export type WhoAmI = { actor: Actor; today: string; toolSetVersion: number };

// start_session takes how many of the changes to answer with at once.
export const startSessionSchema = listActivitySchema.pick({ limit: true });
export type StartSessionInput = z.output<typeof startSessionSchema>;

// A working session's start (F1): the record its start is logged under, and the changes since the
// previous session started, newest first, a page at a time. Those are the changes from `since`
// (inclusive; null when there's no previous session) to this start (not included), so
// list_activity pages on through the same window.
export type SessionStart = {
  session: { id: string; startedAt: Date };
  since: Date | null;
  changes: ActivityEntry[];
  nextOffset: number | null;
};
