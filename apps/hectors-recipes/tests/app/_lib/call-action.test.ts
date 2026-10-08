import { describe, expect, it } from "bun:test";
import { callAction, callResultAction } from "@/app/_lib/call-action";

describe("callAction", () => {
  it("passes through the action's error, or nothing on success", async () => {
    expect(await callAction(async () => ({ error: "No access" }))).toBe(
      "No access",
    );
    expect(await callAction(async () => null)).toBeUndefined();
  });

  it("turns a dropped connection into a message instead of throwing", async () => {
    expect(
      await callAction(async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).toContain("Couldn't reach the server");
  });
});

// P25.1, fix 3: for the actions that say what they did (Add to list, the plan's grocery button).
describe("callResultAction", () => {
  it("passes through the action's state", async () => {
    const state = { ok: true, result: { added: 1 } };
    expect(await callResultAction(async () => state)).toBe(state);
  });

  it("turns a dropped connection into a failed state instead of throwing", async () => {
    const state = await callResultAction(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(state).toEqual({
      ok: false,
      error: "Couldn't reach the server. Check your connection and try again.",
    });
  });
});
