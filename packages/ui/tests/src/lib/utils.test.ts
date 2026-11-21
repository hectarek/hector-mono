import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cn } from "../../../src/lib/utils";

const globals = readFileSync(
  join(__dirname, "../../../src/styles/globals.css"),
  "utf8",
);

// The type sizes globals.css names by their size in px (--text-13: …).
const numberedSizes = [...globals.matchAll(/--text-(\d+):/g)].map(
  ([, size]) => `text-${size}`,
);

describe("cn", () => {
  it("knows every numbered type size in the shared stylesheet", () => {
    expect(numberedSizes.length).toBeGreaterThan(0);
    for (const size of numberedSizes) {
      // A size beside a text color keeps both; a later size replaces it.
      expect(cn(size, "text-destructive")).toBe(`${size} text-destructive`);
      expect(cn(size, "text-sm")).toBe("text-sm");
    }
  });

  it("still merges as tailwind-merge does", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-2xs text-white")).toBe("text-2xs text-white");
    expect(cn("text-foreground", false, "text-destructive")).toBe(
      "text-destructive",
    );
  });
});
