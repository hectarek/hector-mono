import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTION_REACH,
  PAGE_READS,
  ROUTE_REACH,
} from "@/app/_lib/agent-tools/parity";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import type { ActionResult } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { signInAs } from "@/tests/_support/session";

// The parity check (docs/build-plan.md U10, KTD16): every server action, route handler and page
// read reaches Claude through a page tool, or is Hector's alone for a stated reason.

const APP = join(import.meta.dir, "../../../../app");
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

type Action = (input: unknown, tool?: string) => Promise<ActionResult<unknown>>;

// Every exported action in app/actions/, as "<file>.<export>"; shared.ts holds helpers, not actions.
const actions = new Map<string, Action>();
for (const file of readdirSync(join(APP, "actions"))) {
  if (!file.endsWith(".ts") || file === "shared.ts") continue;
  const module: Record<string, unknown> = await import(
    join(APP, "actions", file)
  );
  for (const [name, value] of Object.entries(module)) {
    if (typeof value === "function") {
      actions.set(`${file.replace(/\.ts$/, "")}.${name}`, value as Action);
    }
  }
}

// Every route handler under app/(api)/, as "<path> <method>".
const routes: string[] = [];
for (const file of readdirSync(join(APP, "(api)"), { recursive: true })) {
  if (!String(file).endsWith("route.ts")) continue;
  const path = String(file).replace(/\/?route\.ts$/, "");
  const module: Record<string, unknown> = await import(
    join(APP, "(api)", String(file))
  );
  for (const method of HTTP_METHODS) {
    if (typeof module[method] === "function") routes.push(`${path} ${method}`);
  }
}

// The controllers pages and their loaders call for a read, outside the actions.
const pageReads = new Set<string>();
for (const file of readdirSync(APP, { recursive: true })) {
  const path = String(file);
  if (!/\.tsx?$/.test(path) || path.startsWith("actions/")) continue;
  const source = readFileSync(join(APP, path), "utf8");
  for (const [, controller] of source.matchAll(
    /getInjection\("(I\w+Controller)"\)/g,
  )) {
    if (controller) pageReads.add(controller);
  }
}

const toolNamed = (name: string) =>
  AGENT_TOOLS.find((tool) => tool.name === name);

const missingFrom = (listed: string[], mapped: Record<string, unknown>) =>
  listed.filter((key) => !(key in mapped)).sort();

describe("the parity map", () => {
  it("maps every exported action, and no action that's gone", () => {
    expect(missingFrom([...actions.keys()], ACTION_REACH)).toEqual([]);
    expect(
      Object.keys(ACTION_REACH)
        .filter((key) => !actions.has(key))
        .sort(),
    ).toEqual([]);
  });

  it("maps every route handler, and no route that's gone", () => {
    expect(missingFrom(routes, ROUTE_REACH)).toEqual([]);
    expect(
      Object.keys(ROUTE_REACH)
        .filter((key) => !routes.includes(key))
        .sort(),
    ).toEqual([]);
  });

  it("maps each page's own read to a registered tool, and no read that's gone", () => {
    expect(missingFrom([...pageReads], PAGE_READS)).toEqual([]);
    expect(
      Object.keys(PAGE_READS)
        .filter((key) => !pageReads.has(key))
        .sort(),
    ).toEqual([]);
    for (const tool of Object.values(PAGE_READS)) {
      expect(toolNamed(tool)?.name).toBe(tool);
    }
  });

  it("names, for each action, the tool that calls it, or says why another tool reaches it", () => {
    for (const [key, reach] of Object.entries(ACTION_REACH)) {
      if (!("tool" in reach)) continue;
      const tool = toolNamed(reach.tool);
      expect(tool?.name).toBe(reach.tool);
      if (reach.via === undefined) {
        expect(tool?.action).toBe(actions.get(key));
      } else {
        expect(reach.via.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives every registered tool an action that maps to it", () => {
    const mapped = new Set(
      Object.values(ACTION_REACH).flatMap((reach) =>
        "tool" in reach && reach.via === undefined ? [reach.tool] : [],
      ),
    );
    expect(
      AGENT_TOOLS.map(({ name }) => name)
        .filter((name) => !mapped.has(name))
        .sort(),
    ).toEqual([]);
  });

  it("gives no human-only action or route a tool, and says why each is Hector's", () => {
    for (const [key, reach] of Object.entries({
      ...ACTION_REACH,
      ...ROUTE_REACH,
    })) {
      if (!("humanOnly" in reach)) continue;
      expect(reach.humanOnly.length).toBeGreaterThan(0);
      const action = actions.get(key);
      expect(AGENT_TOOLS.some((tool) => tool.action === action)).toBe(false);
    }
  });
});

describe("a third account", () => {
  it("gets `not-allowed` from every action, and nothing lands in the log", async () => {
    const owner: CurrentActor = {
      actor: "owner",
      ownerId: TEST_ACCOUNTS.owner.user.id,
    };
    const since = new Date().toISOString();

    signInAs("stranger");
    for (const [key, action] of actions) {
      const answer = await action({}, "parity_check");
      expect({ key, code: answer.ok ? "ok" : answer.code }).toEqual({
        key,
        code: "not-allowed",
      });
    }

    const { entries } = await getInjection("IListActivityController")(
      { since },
      owner,
    );
    expect(entries).toEqual([]);
  });
});
