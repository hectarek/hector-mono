import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";

// Claude's page tools in a real browser (docs/build-plan.md KTD16): Chromium with the WebMCP flag,
// signed in as Claude's account on the Neon test project, against the app's dev server. A mocked
// browser API once hid a move from `navigator` to `document` for months; this is the check that
// the real one still registers and runs the tools.

// Claude's account on the test project (the plan's H2), from the app's .env, which holds that
// project's settings only (KTD17).
function claudesTestAccount(): { email: string; password: string } {
  const env = parseEnv(
    readFileSync(path.join(__dirname, "../../.env"), "utf8"),
  );
  const email = env["FLOW_AGENT_EMAIL"];
  const password = env["FLOW_AGENT_PASSWORD"];
  if (!email || !password) {
    throw new Error(
      "The browser flows sign in as Claude's account on the test project: set FLOW_AGENT_EMAIL and FLOW_AGENT_PASSWORD in .env.",
    );
  }
  return { email, password };
}

async function signInAsClaude(page: Page) {
  const { email, password } = claudesTestAccount();
  await page.goto("/welcome");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Claude's session")).toBeVisible();
}

// The names of the tools the page has registered, once it has: they register after it hydrates.
async function toolsListed(page: Page, names: string[]) {
  await expect
    .poll(async () => (await page.webmcp.tools()).map(({ name }) => name))
    .toEqual(expect.arrayContaining(names));
}

// The id of the session a start_session call started.
const sessionStarted = z.object({
  ok: z.literal(true),
  data: z.object({ session: z.object({ id: z.uuid() }) }),
});
const sessionIdOf = (result: unknown): string =>
  sessionStarted.parse(result).data.session.id;

test("Claude's page lists its tools, and start_session logs Claude's session start, without leaving the page", async ({
  page,
}) => {
  await signInAsClaude(page);
  await page.goto("/agent");
  const address = page.url();
  await toolsListed(page, ["whoami", "start_session"]);

  expect(await page.webmcp.callTool("whoami", {})).toMatchObject({
    ok: true,
    data: { actor: "agent" },
  });

  const first = sessionIdOf(await page.webmcp.callTool("start_session", {}));
  // The next session's changes begin with this one's start, as the log has it: Claude's, through
  // the tool.
  const second = await page.webmcp.callTool("start_session", {});
  expect(second).toMatchObject({
    ok: true,
    data: {
      changes: expect.arrayContaining([
        expect.objectContaining({
          actor: "agent",
          tool: "start_session",
          record: { kind: "agent-session", id: first },
          action: "created",
        }),
      ]),
    },
  });

  // Input the tool can't use comes back as `validation`, naming the field.
  expect(
    await page.webmcp.callTool("start_session", { limit: 0 }),
  ).toMatchObject({
    ok: false,
    code: "validation",
    fields: { limit: expect.any(String) },
  });

  // Each write refreshed Claude's page in place.
  await expect(page.getByText("Started a session").first()).toBeVisible();
  expect(page.url()).toBe(address);
});

test("a call after the session has ended answers `unauthenticated`", async ({
  page,
  context,
}) => {
  await signInAsClaude(page);
  await page.goto("/agent");
  await toolsListed(page, ["whoami"]);

  await context.clearCookies();
  expect(await page.webmcp.callTool("whoami", {})).toMatchObject({
    ok: false,
    code: "unauthenticated",
  });
});
