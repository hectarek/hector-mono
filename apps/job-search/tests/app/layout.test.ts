import { describe, expect, it } from "bun:test";
import { metadata } from "@/app/layout";

describe("the root metadata", () => {
  // Every page's, signed out included (R23).
  it("gives the app a generic name, never its owner's", () => {
    expect(metadata.title).toBe("Job search");
    expect(JSON.stringify(metadata)).not.toMatch(/hector/i);
  });
});
