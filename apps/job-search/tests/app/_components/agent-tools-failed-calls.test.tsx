import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { render } from "@testing-library/react";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import {
  FakeModelContext,
  setModelContext,
} from "@/tests/_support/model-context";
import { signInAs } from "@/tests/_support/session";

// Calls that throw, as the browser's do when a deploy removed the action or the connection
// dropped. In a file of its own, so no other test gets these actions.
mock.module("@/app/actions/session", () => ({
  whoami: () =>
    Promise.reject(
      new UnrecognizedActionError(
        'Server Action "7f00" was not found on the server.',
      ),
    ),
  startSession: () => Promise.reject(new TypeError("Failed to fetch")),
}));
// Loaded after the mock, so the tools take the throwing actions.
const { ActorChrome } = await import("@/app/_components/session-chrome");

let browser: FakeModelContext;
let restore: () => void;
beforeEach(() => {
  browser = new FakeModelContext();
  restore = setModelContext(browser);
});
afterEach(() => {
  restore();
});

describe("Claude's page tools, when a call throws", () => {
  // A tool that throws reaches Claude only as "invocation failed" (docs/build-plan.md KTD5).
  it("answers with an envelope Claude can act on", async () => {
    signInAs("agent");
    render(await ActorChrome());

    expect(await browser.call("whoami")).toEqual({
      ok: false,
      code: "reload-needed",
      message: expect.any(String),
    });
    expect(await browser.call("start_session", { limit: 5 })).toEqual({
      ok: false,
      code: "unexpected",
      message: expect.any(String),
    });
  });
});
