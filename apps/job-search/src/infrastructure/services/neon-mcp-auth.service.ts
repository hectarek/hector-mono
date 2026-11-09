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
// without the deployment's variables, and createMcpAuth throws without them. A deployment that
// sets no MCP_RESOURCE serves no endpoint: the endpoint answers 404, and so does the discovery
// file, rather than throwing on every request.
export class NeonMcpAuthService implements IMcpAuthService {
  private auth: McpAuth | undefined;

  constructor(private readonly config: McpAuthConfig) {}

  async authenticate(request: Request): Promise<McpCaller | Response> {
    const auth = this.mcpAuth();
    if (!auth) {
      return new Response("Not found", { status: 404 });
    }
    const result = await auth.requireBearerAuth()(request);
    if (result instanceof Response) {
      return result;
    }
    return { userId: result.sub, authInfo: auth.toAuthInfo(result) };
  }

  discovery(request: Request): Response | undefined {
    return this.mcpAuth()?.handleMetadataRequest(request);
  }

  // Set only where both settings are: the endpoint needs the issuer as well as its own address.
  resource(): string | undefined {
    return this.config.baseUrl ? this.config.resource : undefined;
  }

  private mcpAuth(): McpAuth | undefined {
    const { baseUrl } = this.config;
    const resource = this.resource();
    if (!baseUrl || !resource) {
      return undefined;
    }
    this.auth ??= createMcpAuth({ baseUrl, resource });
    return this.auth;
  }
}
