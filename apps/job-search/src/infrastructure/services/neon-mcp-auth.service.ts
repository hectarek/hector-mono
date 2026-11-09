import { createMcpAuth, type McpAuth } from "@neon/oauth/mcp";
import type {
  IMcpAuthService,
  McpCaller,
} from "@/src/application/services/mcp-auth.service.interface";

// Where the MCP endpoint's settings come from: the branch's Neon Auth URL, the issuer, and the
// endpoint's own URL, the audience Neon's OAuth server issues tokens for.
export type McpAuthConfig = { baseUrl?: string; resource?: string };

// The MCP endpoint's sign-in through Neon Auth's OAuth server (docs/build-plan.md KTD22), with
// @neon/oauth: each token's signature against the issuer's JWKS, its exact issuer and its
// audience. Made on first use, not when the container is, since `next build` loads the routes
// without the deployment's variables, and createMcpAuth throws without them.
export class NeonMcpAuthService implements IMcpAuthService {
  private auth: McpAuth | undefined;

  constructor(private readonly config: McpAuthConfig) {}

  async authenticate(request: Request): Promise<McpCaller | Response> {
    const auth = this.mcpAuth();
    const result = await auth.requireBearerAuth()(request);
    if (result instanceof Response) {
      return result;
    }
    return { userId: result.sub, authInfo: auth.toAuthInfo(result) };
  }

  discovery(request: Request): Response | undefined {
    return this.mcpAuth().handleMetadataRequest(request);
  }

  private mcpAuth(): McpAuth {
    const { baseUrl, resource } = this.config;
    if (!baseUrl || !resource) {
      throw new Error(
        "Missing required env vars: NEON_AUTH_BASE_URL, MCP_RESOURCE",
      );
    }
    this.auth ??= createMcpAuth({ baseUrl, resource });
    return this.auth;
  }
}
