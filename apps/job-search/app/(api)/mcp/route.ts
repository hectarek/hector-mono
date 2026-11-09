import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { mcpServerFor } from "@/app/_lib/agent-tools/mcp-server";
import { getInjection } from "@/di/container";
import { NotAllowedError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";

// Claude's MCP endpoint (docs/build-plan.md KTD22, U18). A request needs an access token that this
// branch's Neon Auth issued for this endpoint, or it gets a 401 that points to the discovery file,
// and the token's account must be Claude's. Stateless: a server and a transport per request,
// answering JSON rather than a stream.
//
// POST only. GET would open a stream for messages the server never sends, which on Vercel keeps a
// function running until its time limit, and DELETE would end a session a stateless server doesn't
// keep. Next answers both with 405, as the MCP spec allows and the SDK's stateless examples do.
export async function POST(request: Request): Promise<Response> {
  const caller = await getInjection("IMcpAuthService").authenticate(request);
  if (caller instanceof Response) {
    return caller;
  }
  let actor: CurrentActor;
  try {
    actor = getInjection("IResolveTokenActor")(caller.userId);
  } catch (err) {
    if (err instanceof NotAllowedError) {
      return Response.json(
        {
          error: "forbidden",
          message: "Only Claude's account uses this endpoint.",
        },
        { status: 403 },
      );
    }
    throw err;
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await mcpServerFor(actor).connect(transport);
  return transport.handleRequest(request, { authInfo: caller.authInfo });
}
