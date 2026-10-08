import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

// D85, P26.4: every style that changes with the screen's width is listed in the map's Wide
// screens section, with why, so a responsive change is a choice and not drift.
const APP = path.join(import.meta.dir, "..", "..");
const WIDTH_CLASS = /\b(?:sm|md|lg|xl|2xl):[\w./:[\]()-]+/g;

// "file: class" for each width-specific class in app/, once per file.
function inTheApp(): string[] {
  const found = new Set<string>();
  for (const file of new Bun.Glob("app/**/*.{ts,tsx}").scanSync(APP)) {
    const source = readFileSync(path.join(APP, file), "utf8");
    for (const [match] of source.matchAll(WIDTH_CLASS)) {
      found.add(`${file}: ${match}`);
    }
  }
  return [...found].sort();
}

// The same, from the Wide screens table: a file in the first column, classes in the second.
function inTheMap(): string[] {
  const map = readFileSync(path.join(APP, "docs", "ux-map.md"), "utf8");
  const section = map.split("## Wide screens")[1]?.split("\n## ")[0] ?? "";
  const listed = new Set<string>();
  for (const row of section.split("\n")) {
    const [, file, classes] = row.split("|").map((cell) => cell.trim());
    const filePath = file?.match(/^`(app\/[^`]+)`$/)?.[1];
    if (!filePath || !classes) continue;
    for (const [, name] of classes.matchAll(/`([^`]+)`/g)) {
      listed.add(`${filePath}: ${name}`);
    }
  }
  return [...listed].sort();
}

describe("wide screens", () => {
  it("lists every width-specific style in the map, and nothing that's gone", () => {
    const listed = inTheMap();
    expect(listed.length).toBeGreaterThan(0);
    expect(inTheApp()).toEqual(listed);
  });
});
