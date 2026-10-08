import { describe, expect, it } from "bun:test";
import { loneLink, pastedFrom } from "@/app/_lib/pasted-from";

// D73: one box for a link or a recipe's text; only a lone web address is read as a page.
describe("loneLink", () => {
  it.each([
    ["nytimes.com/recipes/1234", "https://nytimes.com/recipes/1234"],
    [
      "  https://www.bonappetit.com/recipe/x\n",
      "https://www.bonappetit.com/recipe/x",
    ],
    ["Chili\n\n1 lb beans\n\nSimmer.", undefined],
    ["https://example.com/chili and some notes", undefined],
    ["Chili", undefined],
    ["", undefined],
  ])("%j is %j", (box, expected) => {
    expect(loneLink(box)).toBe(expected);
  });
});

// Text pasted after a link keeps that link as its source only when it's a web page's address
// (P14.11): a link the importer refused isn't one.
describe("pastedFrom", () => {
  it.each([
    ["nytimes.com/recipes/1234", "https://nytimes.com/recipes/1234"],
    [
      "https://www.bonappetit.com/recipe/x",
      "https://www.bonappetit.com/recipe/x",
    ],
    ["  http://example.com/toast ", "http://example.com/toast"],
    ["toast", undefined],
    ["toast.", undefined],
    ["localhost.", undefined],
    ["localhost:3000/recipe", undefined],
    ["http://127.0.0.1/recipe", undefined],
    ["http://[::1]/recipe", undefined],
    ["ftp://example.com/recipe", undefined],
    ["", undefined],
  ])("%p is %p", (typed, source) => {
    expect(pastedFrom(typed)).toBe(source);
  });
});
