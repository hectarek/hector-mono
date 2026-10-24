import { afterEach, describe, expect, it } from "bun:test";
import { type PageTool, registerPageTools } from "@/app/_lib/page-tools";
import {
  FakeModelContext,
  setModelContext,
} from "@/tests/_support/model-context";

const tool = (name: string): PageTool => ({
  name,
  description: `Answers with ${name}`,
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true },
  execute: async () => ({
    ok: true,
    data: name,
    asOf: "2026-10-23T13:00:00.000Z",
  }),
});

// Lets the browser settle the registrations it has queued.
const settle = () => Bun.sleep(1);

let restore = () => {};
afterEach(() => {
  restore();
});

describe("registerPageTools", () => {
  it("registers each tool with the page's model context until the signal aborts", async () => {
    const browser = new FakeModelContext();
    restore = setModelContext(browser);
    const registration = new AbortController();

    registerPageTools(
      [tool("whoami"), tool("start_session")],
      registration.signal,
    );
    await settle();
    expect((await browser.getTools()).map(({ name }) => name)).toEqual([
      "whoami",
      "start_session",
    ]);
    expect(await browser.call("start_session")).toEqual({
      ok: true,
      data: "start_session",
      asOf: "2026-10-23T13:00:00.000Z",
    });

    registration.abort();
    expect(await browser.getTools()).toEqual([]);
  });

  // bun:test fails a test that leaves a rejection unhandled.
  it("lets the browser's refusals pass quietly: a registration aborted before it settles, and a name already registered", async () => {
    const browser = new FakeModelContext();
    restore = setModelContext(browser);

    const first = new AbortController();
    registerPageTools([tool("whoami")], first.signal);
    first.abort();
    registerPageTools([tool("whoami")], new AbortController().signal);
    registerPageTools([tool("whoami")], new AbortController().signal);
    await settle();

    expect(browser.registrations.map(({ name }) => name)).toEqual([
      "whoami",
      "whoami",
      "whoami",
    ]);
    expect((await browser.getTools()).map(({ name }) => name)).toEqual([
      "whoami",
    ]);
  });

  it("does nothing in a browser without page tools", () => {
    restore = setModelContext(undefined);
    expect(() =>
      registerPageTools([tool("whoami")], new AbortController().signal),
    ).not.toThrow();
  });
});
