import type {
  IMcpAuthService,
  McpCaller,
} from "@/src/application/services/mcp-auth.service.interface";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";

const RESOURCE = "http://localhost:3101/mcp";
const DISCOVERY = "/.well-known/oauth-protected-resource";

// The test container's MCP sign-in: a fixed token per test account stands in for a JWT Neon
// issued, and any other token, or none, gets the 401 a real check answers.
export const TEST_MCP_TOKENS = {
  owner: "test-token-owner",
  agent: "test-token-agent",
  stranger: "test-token-stranger",
} as const;

const ACCOUNT_OF_TOKEN = new Map<string, string>(
  Object.entries(TEST_MCP_TOKENS).map(([account, token]) => [
    token,
    TEST_ACCOUNTS[account as keyof typeof TEST_MCP_TOKENS].user.id,
  ]),
);

export class MockMcpAuthService implements IMcpAuthService {
  async authenticate(request: Request): Promise<McpCaller | Response> {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    const userId = token ? ACCOUNT_OF_TOKEN.get(token) : undefined;
    if (!token || !userId) {
      return new Response(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="http://localhost:3101${DISCOVERY}/mcp"`,
        },
      });
    }
    return {
      userId,
      authInfo: {
        token,
        clientId: "https://claude.ai/oauth/claude-code-client-metadata",
        scopes: ["openid", "offline_access"],
        resource: new URL(RESOURCE),
      },
    };
  }

  discovery(request: Request): Response | undefined {
    if (!new URL(request.url).pathname.startsWith(DISCOVERY)) {
      return undefined;
    }
    return Response.json({
      resource: RESOURCE,
      authorization_servers: ["https://auth.example.com/neondb/auth"],
    });
  }
}
