import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { type ActionResult, answer } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";

// What an endpoint tool runs: the controller its page tool's server action calls, given the
// actor the token resolved to rather than the session's, answered with the same envelope.
type ServerCall = (
  input: unknown,
  actor: CurrentActor,
) => Promise<ActionResult<unknown>>;

// The tools the MCP endpoint serves so far (docs/build-plan.md U18's spike): reads only. Each
// keeps its page tool's name, description, schema and annotations from the registry (KTD5).
const SERVER_CALLS: Record<string, ServerCall> = {
  whoami: (input, actor) =>
    answer("whoami", "Couldn't tell who's signed in. Try again.", async () =>
      getInjection("IWhoamiController")(input, actor),
    ),
  get_today: (input, actor) =>
    answer("getToday", "Couldn't read this week. Try again.", async () =>
      getInjection("IGetTodayController")(input, actor),
    ),
};

const SERVED = AGENT_TOOLS.filter(({ name }) => name in SERVER_CALLS);

// One MCP server per request, for the actor the request's token resolved to (KTD22). The endpoint
// is stateless: nothing is kept between requests but what the tools write.
export function mcpServerFor(actor: CurrentActor): Server {
  const server = new Server(
    { name: "job-search", version: String(TOOL_SET_VERSION) },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: SERVED.map(({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema: inputSchema as { type: "object" },
      annotations: { readOnlyHint: annotations?.readOnlyHint === true },
    })),
  }));
  server.setRequestHandler(
    CallToolRequestSchema,
    async ({ params }): Promise<CallToolResult> => {
      const call = SERVER_CALLS[params.name];
      if (!call) {
        return {
          content: [{ type: "text", text: `Unknown tool: ${params.name}` }],
          isError: true,
        };
      }
      const result = await call(params.arguments ?? {}, actor);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        isError: !result.ok,
      };
    },
  );
  return server;
}
