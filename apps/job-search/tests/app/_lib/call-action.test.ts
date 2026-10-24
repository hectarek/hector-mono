import { describe, expect, it } from "bun:test";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { callAction } from "@/app/_lib/call-action";
import type { ActionResult } from "@/app/actions/shared";

describe("callAction", () => {
  it("answers with the action's envelope unchanged, a failure's too", async () => {
    const done: ActionResult<{ id: string }> = {
      ok: true,
      data: { id: "00000000-0000-4000-8000-0000000000b1" },
      asOf: "2026-10-23T13:00:00.000Z",
    };
    const refused: ActionResult<{ id: string }> = {
      ok: false,
      code: "validation",
      message: "Limit: Too small: expected number to be >=1",
      fields: { limit: "Too small: expected number to be >=1" },
    };
    expect(await callAction(async () => done)).toBe(done);
    expect(await callAction(async () => refused)).toBe(refused);
  });

  // KTD5: the open page predates a deploy that removed the action, so nothing ran.
  it("answers `reload-needed` when the server doesn't know the action", async () => {
    const removed = () =>
      Promise.reject(
        new UnrecognizedActionError(
          'Server Action "7f00" was not found on the server.',
        ),
      );
    expect(await callAction(removed)).toEqual({
      ok: false,
      code: "reload-needed",
      message:
        "The app changed since this page loaded, and nothing was done. Reload the page and try again.",
    });
  });

  it("answers `unexpected` when the server can't be reached", async () => {
    const offline = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await callAction(offline)).toEqual({
      ok: false,
      code: "unexpected",
      message:
        "Couldn't reach the server. Check your connection and try again.",
    });
  });
});
