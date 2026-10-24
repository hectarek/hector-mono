import { describe, expect, it } from "bun:test";
import { safeRedirect } from "@/app/_lib/safe-redirect";

describe("safeRedirect", () => {
  it("keeps paths inside the app, query and all", () => {
    expect(safeRedirect("/join/abc")).toBe("/join/abc");
    expect(safeRedirect("/plan?week=2026-09-21&plan=x")).toBe(
      "/plan?week=2026-09-21&plan=x",
    );
    expect(safeRedirect(["/groceries", "/other"])).toBe("/groceries");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\t/evil.com",
    "https://evil.com",
    "evil.com",
    "//[",
  ])("sends %p home instead", (target) => {
    expect(safeRedirect(target)).toBe("/");
  });

  it("falls back to home when there's nothing to go back to", () => {
    expect(safeRedirect(undefined)).toBe("/");
  });
});
