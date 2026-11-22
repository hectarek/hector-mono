import { describe, expect, it } from "bun:test";
import { safeRedirect } from "@/app/_lib/safe-redirect";

describe("safeRedirect", () => {
  it("keeps paths inside the app, query and all", () => {
    expect(safeRedirect("/f/K7Q2-HARB")).toBe("/f/K7Q2-HARB");
    expect(safeRedirect("/?q=ticket&players=4")).toBe("/?q=ticket&players=4");
    expect(safeRedirect(["/loans", "/other"])).toBe("/loans");
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
