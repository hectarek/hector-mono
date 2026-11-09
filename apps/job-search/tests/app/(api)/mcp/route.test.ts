import { describe, expect, it } from "bun:test";
import { GET as discovery } from "@/app/.well-known/oauth-protected-resource/[[...path]]/route";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { POST } from "@/app/(api)/mcp/route";
import { whoami } from "@/app/actions/session";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { TEST_MCP_TOKENS } from "@/src/infrastructure/services/mock-mcp-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const OWNER: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

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

// A tool call with Claude's token: whether MCP marks it an error, and the envelope it carries.
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const result = await resultOf(
    await rpc("tools/call", { name, arguments: args }, TEST_MCP_TOKENS.agent),
  );
  return { isError: result.isError, envelope: envelopeOf(result) };
};

// A company of the test's own, made through the endpoint, as it is after the save.
const newCompany = async () => {
  const name = `Endpoint Co ${crypto.randomUUID().slice(0, 8)}`;
  const { envelope } = await call("save_company", { name });
  return envelope.data.company as {
    id: string;
    name: string;
    updatedAt: string;
  };
};

type ListedTool = {
  name: string;
  description: string;
  inputSchema: { type?: unknown };
  annotations: unknown;
};

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

  it("lists every page tool, with its name, description and schema, and its annotations in MCP's terms", async () => {
    const { tools } = (await resultOf(
      await rpc("tools/list", {}, TEST_MCP_TOKENS.agent),
    )) as { tools: ListedTool[] };
    expect(
      tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    ).toEqual(
      AGENT_TOOLS.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    );
    // MCP takes only an object's schema as a tool's input.
    for (const { inputSchema } of tools) {
      expect(inputSchema.type).toBe("object");
    }
    const annotationsOf = (name: string) =>
      tools.find((tool) => tool.name === name)?.annotations;
    expect(annotationsOf("get_today")).toEqual({
      readOnlyHint: true,
      openWorldHint: false,
    });
    expect(annotationsOf("save_company")).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    });
    // close_job is the one consequential tool (KTD5).
    expect(annotationsOf("close_job")).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    });
  });

  it("answers whoami as Claude, with the tool set's version", async () => {
    const { isError, envelope } = await call("whoami");
    expect(isError).toBe(false);
    expect(envelope).toMatchObject({
      ok: true,
      data: { actor: "agent", toolSetVersion: TOOL_SET_VERSION },
    });
  });

  it("acts as Claude whatever session the request carries, Hector's included", async () => {
    for (const account of ["owner", "signed-out"] as const) {
      signInAs(account);
      expect((await call("whoami")).envelope).toMatchObject({
        ok: true,
        data: { actor: "agent" },
      });
    }
  });

  it("answers get_today with the same envelope the page tool gets", async () => {
    const { envelope } = await call("get_today");
    expect(envelope).toMatchObject({
      ok: true,
      data: { due: expect.any(Object), blocks: expect.any(Array) },
    });
  });

  it("runs a write as its page tool does: the history names Claude and the tool, and the same pages refresh", async () => {
    signInAs("signed-out");
    nextState.revalidated = [];
    const company = await newCompany();

    const { entries } = await getInjection("IListActivityController")(
      { record: { kind: "company", id: company.id } },
      OWNER,
    );
    expect(entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "save_company",
        action: "created",
      }),
    ]);
    expect(nextState.revalidated).toEqual([
      "/companies",
      `/companies/${company.id}`,
      "/agent",
    ]);
  });

  it("answers a change made against an old read with conflict and the record as it is now", async () => {
    const company = await newCompany();
    const read = { id: company.id, updatedAt: company.updatedAt };
    await call("save_company", { ...read, location: "Remote" });

    const { isError, envelope } = await call("save_company", {
      ...read,
      location: "Anywhere",
    });
    expect(isError).toBe(true);
    expect(envelope).toMatchObject({
      ok: false,
      code: "conflict",
      current: { id: company.id, location: "Remote" },
    });
  });

  it("answers bad input with validation, by field, and writes nothing", async () => {
    // Claude's latest change in the log: a time can't tell, since writes share a millisecond.
    const latest = async () =>
      (
        await getInjection("IListActivityController")(
          { actor: "agent", limit: 1 },
          OWNER,
        )
      ).entries[0]?.id;
    const before = await latest();

    const { isError, envelope } = await call("save_company", {});
    expect(isError).toBe(true);
    expect(envelope).toMatchObject({
      ok: false,
      code: "validation",
      fields: { name: "A company needs a name" },
    });
    expect(await latest()).toBe(before);
  });

  it("serves no human-only operation, which has no page tool", async () => {
    const result = await resultOf(
      await rpc(
        "tools/call",
        { name: "delete_company", arguments: {} },
        TEST_MCP_TOKENS.agent,
      ),
    );
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Unknown tool: delete_company" },
    ]);
  });

  it("acts as Claude only inside its own call: an action outside it reads the session", async () => {
    signInAs("signed-out");
    await call("whoami");
    expect(await whoami({})).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
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
