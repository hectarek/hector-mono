import { describe, expect, it } from "bun:test";
import { hasEarlierPage } from "@/app/_lib/go-back";

describe("hasEarlierPage", () => {
  it("takes the Navigation API's answer when there is one", () => {
    expect(hasEarlierPage({ canGoBack: false }, 5)).toBe(false);
    expect(hasEarlierPage({ canGoBack: true }, 1)).toBe(true);
  });

  it("counts any earlier entry in the tab without it", () => {
    expect(hasEarlierPage(undefined, 1)).toBe(false);
    expect(hasEarlierPage(undefined, 2)).toBe(true);
    expect(hasEarlierPage({}, 2)).toBe(true);
  });
});
