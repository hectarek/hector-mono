import { describe, expect, it } from "bun:test";
import { itemizeLine, lineText } from "@/src/entities/ingredient-item";

// Real lines from Hector's recipes (ux-plan D23). This is the instant, best-effort split used
// when lines are pasted or typed as text; the AI re-read (P9.3) is the careful one.
describe("itemizeLine", () => {
  it.each([
    [
      "2 tablespoons olive oil",
      { quantity: 2, unit: "tbsp", name: "olive oil", note: null },
    ],
    [
      "1/2 cup pineapple, diced",
      { quantity: 0.5, unit: "cup", name: "pineapple", note: "diced" },
    ],
    [
      "4 garlic cloves, minced",
      { quantity: 4, unit: "clove", name: "garlic", note: "minced" },
    ],
    // P19.4's units: written after the name too, and "whole" kept as written (the catalog
    // name drops it).
    [
      "2 celery stalks, finely diced",
      { quantity: 2, unit: "stalk", name: "celery", note: "finely diced" },
    ],
    [
      "1 whole Large Onion, Diced",
      {
        quantity: 1,
        unit: null,
        name: "whole Large Onion",
        note: "Diced",
        catalogName: "onion",
      },
    ],
    [
      "Kosher salt, to taste",
      { quantity: null, unit: null, name: "Kosher salt", note: "to taste" },
    ],
    [
      "Salt and pepper to taste",
      { quantity: null, unit: null, name: "Salt and pepper", note: "to taste" },
    ],
    [
      "1 can (14 ounces) crushed tomatoes",
      {
        quantity: 1,
        unit: "can",
        name: "crushed tomatoes (14 ounces)",
        note: null,
      },
    ],
    // After a measuring unit, a bracket is the same amount in another unit, not part of the
    // name (Umami Girl's lines, and the vault's honey); after a package unit it's the size.
    [
      "2 tablespoons (30 ml) olive oil, divided",
      { quantity: 2, unit: "tbsp", name: "olive oil", note: "divided" },
    ],
    // NYT Cooking writes the metric amount after a slash.
    [
      "1¾ cups/225 grams all-purpose flour",
      { quantity: 1.75, unit: "cup", name: "all-purpose flour", note: null },
    ],
    [
      "⅓ cup/80 milliliters white miso paste",
      { unit: "cup", name: "white miso paste", note: null },
    ],
    [
      "110 g (⅓ cup) honey",
      { quantity: 110, unit: "g", name: "honey", note: null },
    ],
    [
      "1 (15-ounce) can black beans",
      { quantity: 1, unit: "can", name: "black beans (15-ounce)", note: null },
    ],
    [
      "1 cup cooked black beans (or 1 can, drained and rinsed)",
      {
        quantity: 1,
        unit: "cup",
        name: "cooked black beans",
        note: "or 1 can, drained and rinsed",
      },
    ],
    [
      "1/4 cup water (or more for desired consistency)",
      {
        quantity: 0.25,
        unit: "cup",
        name: "water",
        note: "or more for desired consistency",
      },
    ],
    [
      "1/2 cup chopped [**red onion**](https://amzn.to/2VTrXMF)",
      { quantity: 0.5, unit: "cup", name: "chopped red onion", note: null },
    ],
  ])("splits %p", (raw, expected) => {
    expect(itemizeLine(raw)).toMatchObject({ ...expected, optional: false });
  });

  it("flags optional ingredients and keeps the flag out of the note", () => {
    expect(itemizeLine("1/4 cup cashews (optional)")).toMatchObject({
      name: "cashews",
      note: null,
      optional: true,
    });
    expect(itemizeLine("Fresh parsley, chopped (optional)")).toMatchObject({
      name: "Fresh parsley",
      note: "chopped",
      optional: true,
    });
  });

  it("links the line to the shared ingredient by its catalog name", () => {
    expect(itemizeLine("4 garlic cloves, minced").catalogName).toBe("garlic");
    expect(itemizeLine("1 can (14 ounces) crushed tomatoes").catalogName).toBe(
      "crushed tomato",
    );
  });

  // A can's size written before it, unbracketed, is the can's size, as when bracketed.
  it.each([
    [
      "15-ounce can chickpeas (or 1 1/2 cups cooked)",
      {
        quantity: 1,
        unit: "can",
        name: "chickpeas (15-ounce)",
        note: "or 1 1/2 cups cooked",
      },
    ],
    [
      "2 15.5-oz. cans cannellini beans, drained, rinsed",
      {
        quantity: 2,
        unit: "can",
        name: "cannellini beans (15.5-oz.)",
        note: "drained, rinsed",
      },
    ],
  ])("reads the can size in %p", (raw, expected) => {
    expect(itemizeLine(raw)).toMatchObject(expected);
  });
});

// A row typed or changed in the editor gets its line written out from its fields.
describe("lineText", () => {
  const fields = { quantity: null, unit: null, note: null, optional: false };
  it.each([
    [
      { ...fields, quantity: 2, unit: "tbsp" as const, name: "olive oil" },
      "2 tbsp olive oil",
    ],
    [
      {
        ...fields,
        quantity: 4,
        unit: "clove" as const,
        name: "garlic",
        note: "minced",
      },
      "4 cloves garlic, minced",
    ],
    [
      {
        ...fields,
        quantity: 0.25,
        unit: "cup" as const,
        name: "cashews",
        optional: true,
      },
      "¼ cup cashews (optional)",
    ],
    [
      { ...fields, name: "Salt and pepper", note: "to taste" },
      "Salt and pepper, to taste",
    ],
    [
      { ...fields, quantity: 1.6, unit: "cup" as const, name: "milk" },
      "1.6 cups milk",
    ],
  ])("%#: %p", (line, expected) => {
    expect(lineText(line)).toBe(expected);
  });
});
