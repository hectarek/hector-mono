import { z } from "zod";
import type { PageTool } from "@/app/_lib/page-tools";
import { startSession, whoami } from "@/app/actions/session";
import type { ActionResult } from "@/app/actions/shared";
import {
  startSessionSchema,
  whoamiSchema,
} from "@/src/entities/models/agent-session.model";

// Claude's page tools (docs/build-plan.md KTD5), registered for Claude's session by
// app/_components/agent-tools.tsx, and listed on Claude's page (/agent). A tool that's added,
// removed or changed bumps TOOL_SET_VERSION (src/entities/models/agent-session.model.ts).
//
// - Names are snake_case and at most 30 characters (Playwright MCP adds `webmcp_`, Claude Code
//   `mcp__playwright__`), and actions check the name they're given.
// - Descriptions stay under 500 characters and generic: no specific of the search (R24).
// - Each input schema is the entity schema the tool's controller parses with, as JSON Schema.
// - Annotations: readOnlyHint on reads, consequentialHint on steps Claude Code asks about first,
//   untrustedContentHint on results that can carry outside text (KTD21).
type AgentTool = Omit<PageTool, "execute"> & {
  // The server action a call runs, given the input and the tool's name.
  action: (input: unknown, tool: string) => Promise<ActionResult<unknown>>;
};

const inputSchemaOf = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: "input" });

export const AGENT_TOOLS: readonly AgentTool[] = [
  {
    name: "whoami",
    description:
      "Who this browser session acts as (agent or owner), today's date in Eastern time (YYYY-MM-DD) and the tool set's version. Call it first, to check the sign-in and the date.",
    inputSchema: inputSchemaOf(whoamiSchema),
    annotations: { readOnlyHint: true },
    action: whoami,
  },
  {
    name: "start_session",
    description:
      "Call once, at the start of a working session. Logs the start, then answers with every change since the previous session started, newest first: who made it (owner, agent, import or system), the tool, the record, and each field before and after. limit sets how many come back (1 to 50, default 20); nextOffset is null when that's all of them.",
    inputSchema: inputSchemaOf(startSessionSchema),
    annotations: { untrustedContentHint: true },
    action: startSession,
  },
];
