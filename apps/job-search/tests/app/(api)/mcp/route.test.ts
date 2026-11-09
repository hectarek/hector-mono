import { describe, expect, it } from "bun:test";
import { GET as discovery } from "@/app/.well-known/oauth-protected-resource/[[...path]]/route";
import { POST } from "@/app/(api)/mcp/route";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";
import { TEST_MCP_TOKENS } from "@/src/infrastructure/services/mock-mcp-auth.service";

// One JSON-RPC request to the MCP endpoint, as Claude Code sends it, with a bearer token or none.
const rpc = (
  method: string,
  params: Record<string, unknown> = {},
  token?: string,
) =>
  POST(
    new Request("http://localhost:3101/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );

const resultOf = async (response: Response) => {
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result?: unknown; error?: unknown };
  expect(body.error).toBeUndefined();
  return body.result as Record<string, unknown>;
};

// What a tool answered: the action envelope, as the content's text.
const envelopeOf = (result: Record<string, unknown>) =>
  JSON.parse(
    (result.content as { type: string; text: string }[])[0]?.text ?? "null",
  );

describe("the MCP endpoint (KTD22, U18)", () => {
  it("answers a request with no token, or a bad one, with a 401 that points to the discovery file", async () => {
    for (const token of [undefined, "not-a-token"]) {
      const response = await rpc("tools/list", {}, token);
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain(
        "resource_metadata=",
      );
    }
  });

  it("refuses a valid token of Hector's account, or any account but Claude's", async () => {
    for (const token of [TEST_MCP_TOKENS.owner, TEST_MCP_TOKENS.stranger]) {
      const response = await rpc("tools/list", {}, token);
      expect(response.status).toBe(403);
    }
  });

  it("lists the tools it serves, with the page tools' names and schemas", async () => {
    const { tools } = await resultOf(
      await rpc("tools/list", {}, TEST_MCP_TOKENS.agent),
    );
    expect((tools as { name: string }[]).map(({ name }) => name)).toEqual([
      "whoami",
      "get_today",
    ]);
    expect(tools).toContainEqual(
      expect.objectContaining({
        name: "get_today",
        annotations: { readOnlyHint: true },
        inputSchema: expect.objectContaining({ type: "object" }),
      }),
    );
  });

  it("answers whoami as Claude, with the tool set's version", async () => {
    const result = await resultOf(
      await rpc(
        "tools/call",
        { name: "whoami", arguments: {} },
        TEST_MCP_TOKENS.agent,
      ),
    );
    expect(result.isError).toBe(false);
    expect(envelopeOf(result)).toMatchObject({
      ok: true,
      data: { actor: "agent", toolSetVersion: TOOL_SET_VERSION },
    });
  });

  it("answers get_today with the same envelope the page tool gets", async () => {
    const result = await resultOf(
      await rpc(
        "tools/call",
        { name: "get_today", arguments: {} },
        TEST_MCP_TOKENS.agent,
      ),
    );
    expect(envelopeOf(result)).toMatchObject({
      ok: true,
      data: { due: expect.any(Object), blocks: expect.any(Array) },
    });
  });

  it("says so for a tool it doesn't serve", async () => {
    const result = await resultOf(
      await rpc(
        "tools/call",
        { name: "delete_everything", arguments: {} },
        TEST_MCP_TOKENS.agent,
      ),
    );
    expect(result.isError).toBe(true);
  });
});

describe("the MCP endpoint's discovery file (RFC 9728)", () => {
  it("names the issuer, at the path-inserted URL", async () => {
    const response = discovery(
      new Request(
        "http://localhost:3101/.well-known/oauth-protected-resource/mcp",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource: "http://localhost:3101/mcp",
      authorization_servers: [expect.any(String)],
    });
  });
});
