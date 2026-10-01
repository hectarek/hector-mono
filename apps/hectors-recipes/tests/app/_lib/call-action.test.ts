import { describe, expect, it } from "bun:test";
import { callAction } from "@/app/_lib/call-action";

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
