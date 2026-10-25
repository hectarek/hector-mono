import { describe, expect, it } from "bun:test";
import { withShow } from "@/app/_lib/plan-href";

// D93: the week's filter travels with the week's links.
describe("withShow", () => {
  it("sets the filter and keeps the rest of the address", () => {
    expect(withShow("/plan?week=2026-10-26&plan=p", "eat")).toBe(
      "/plan?week=2026-10-26&plan=p&show=eat",
    );
    expect(withShow("/plan?show=eat&week=2026-10-26", "cook")).toBe(
      "/plan?show=cook&week=2026-10-26",
    );
  });

  it("leaves every meal, the default, out of the address", () => {
    expect(withShow("/plan?week=2026-10-26&show=cook", "all")).toBe(
      "/plan?week=2026-10-26",
    );
    expect(withShow("/plan?show=eat", "all")).toBe("/plan");
    expect(withShow("/plan", "all")).toBe("/plan");
  });
});
