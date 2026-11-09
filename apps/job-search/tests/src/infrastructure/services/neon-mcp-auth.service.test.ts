import { describe, expect, it } from "bun:test";
import { NeonMcpAuthService } from "@/src/infrastructure/services/neon-mcp-auth.service";

// Nothing here reaches Neon: a request without a token, and the discovery file, are answered from
// the settings alone.
const ISSUER = "https://auth.example.com/neondb/auth";
const RESOURCE = "https://app.example.com/mcp";
const DISCOVERY =
  "https://app.example.com/.well-known/oauth-protected-resource/mcp";

const post = (url: string) => new Request(url, { method: "POST" });

describe("the MCP endpoint's sign-in, where the deployment sets no MCP_RESOURCE", () => {
  const service = new NeonMcpAuthService({ baseUrl: ISSUER });

  it("serves no endpoint: every request gets a 404, with no token check", async () => {
    const answer = await service.authenticate(post(RESOURCE));
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).status).toBe(404);
  });

  it("serves no discovery file, and names no address", () => {
    expect(service.discovery(new Request(DISCOVERY))).toBeUndefined();
    expect(service.resource()).toBeUndefined();
  });
});

describe("the MCP endpoint's sign-in, with the issuer and the address set", () => {
  const service = new NeonMcpAuthService({
    baseUrl: ISSUER,
    resource: RESOURCE,
  });

  it("answers a request with no token with a 401 that points to the discovery file", async () => {
    const answer = await service.authenticate(post(RESOURCE));
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).status).toBe(401);
    expect((answer as Response).headers.get("www-authenticate")).toContain(
      `resource_metadata="${DISCOVERY}"`,
    );
  });

  it("serves the discovery file, naming the issuer, and names the address", async () => {
    const file = service.discovery(new Request(DISCOVERY));
    expect(await file?.json()).toMatchObject({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
    });
    expect(service.resource()).toBe(RESOURCE);
  });
});
