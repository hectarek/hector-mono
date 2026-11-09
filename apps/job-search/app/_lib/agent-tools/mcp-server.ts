import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { withTokenActor } from "@/app/_lib/current-actor";
import type { PageTool } from "@/app/_lib/page-tools";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";

const TOOLS = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]));

// A page tool's annotations in MCP's terms. A write is destructive only when it's consequential
// (a step Claude Code asks about first), and additive otherwise. Every tool works on the app's own
// records, a closed world. MCP has no hint for outside text, so the descriptions say where a
// result can carry it (KTD21).
function annotationsOf({
  readOnlyHint,
  consequentialHint,
}: PageTool["annotations"] = {}): ToolAnnotations {
  return readOnlyHint
    ? { readOnlyHint: true, openWorldHint: false }
    : {
        readOnlyHint: false,
        destructiveHint: consequentialHint === true,
        openWorldHint: false,
      };
}

// One MCP server per request, for the actor the request's token resolved to (docs/build-plan.md
// KTD22). It serves every page tool in the registry, with its name, description and schema (KTD5),
// and a call runs the page tool's own action as that actor, so it answers with the same envelope,
// refreshes the same pages and names the tool in the history. The endpoint is stateless: nothing
// is kept between requests but what the tools write.
export function mcpServerFor(actor: CurrentActor): Server {
  const server = new Server(
    { name: "job-search", version: String(TOOL_SET_VERSION) },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: AGENT_TOOLS.map(
      ({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema: inputSchema as { type: "object" },
        annotations: annotationsOf(annotations),
      }),
    ),
  }));
  server.setRequestHandler(
    CallToolRequestSchema,
    async ({ params }): Promise<CallToolResult> => {
      const tool = TOOLS.get(params.name);
      if (!tool) {
        return {
          content: [{ type: "text", text: `Unknown tool: ${params.name}` }],
          isError: true,
        };
      }
      const result = await withTokenActor(actor, () =>
        tool.action(params.arguments ?? {}, tool.name),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        isError: !result.ok,
      };
    },
  );
  return server;
}
