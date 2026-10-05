import { describe, expect, it } from "bun:test";
import {
  amountText,
  formatQuantity,
  readAmount,
  scaleLine,
  showLine,
} from "@/src/entities/scaling";

describe("formatQuantity", () => {
  it.each([
    [1, "1"],
    [0.5, "½"],
    [0.25, "¼"],
    [1.5, "1½"],
    [1 / 3, "⅓"],
    [2 / 3, "⅔"],
    [0.75, "¾"],
    [0.125, "⅛"],
    [1.49, "1½"],
    [1.97, "2"],
    [0.01, "⅛"],
    [12.4, "12"],
    [165, "165"],
  ])("%p → %p", (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });
});

describe("readAmount", () => {
  it.each([
    ["2", 2],
    [" 1 1/2 ", 1.5],
    ["1½", 1.5],
    ["½", 0.5],
    ["0.75", 0.75],
    ["2 cups", null],
    ["two", null],
    ["0", null],
  ])("%p → %p", (text, expected) => {
    expect(readAmount(text)).toBe(expected);
  });
});

// The editor shows a stored amount in a box and reads it back on save: it must not drift.
describe("amountText", () => {
  it.each([
    [0.5, "½"],
    [1 + 2 / 3, "1⅔"],
    [1 / 3, "⅓"],
    [1.6, "1.6"],
    [12, "12"],
    [12.5, "12.5"],
  ])("%p → %p, and back", (value, expected) => {
    expect(amountText(value)).toBe(expected);
    expect(readAmount(amountText(value))).toBeCloseTo(value, 9);
  });
});

describe("scaleLine", () => {
  it("returns the raw line untouched at factor 1", () => {
    expect(scaleLine("1 1/2 cups flour", 1)).toBe("1 1/2 cups flour");
  });

  it("says a new unit in the singular or plural as the amount needs (P19.4)", () => {
    expect(scaleLine("2 stalks celery", 0.5)).toBe("1 stalk celery");
    expect(scaleLine("1 sprig thyme", 3)).toBe("3 sprigs thyme");
    expect(scaleLine("1 pint grape tomatoes", 2)).toBe(
      "2 pints grape tomatoes",
    );
  });

  it("rewrites only the leading quantity", () => {
    expect(scaleLine("1 1/2 cups all-purpose flour", 2)).toBe(
      "3 cups all-purpose flour",
    );
    expect(scaleLine("110 g (⅓ cup) honey", 1.5)).toBe("165 g (½ cup) honey");
    expect(scaleLine("½ tsp salt", 0.5)).toBe("¼ tsp salt");
  });

  it("scales an alternate measure in brackets after a measuring unit", () => {
    expect(scaleLine("110 g (⅓ cup) honey", 2)).toBe("220 g (⅔ cup) honey");
    expect(scaleLine("1 cup (2 sticks) unsalted butter", 2)).toBe(
      "2 cups (4 sticks) unsalted butter",
    );
    expect(scaleLine("1/4 teaspoon (1 ml) salt", 2)).toBe(
      "½ teaspoon (2 ml) salt",
    );
  });

  it("leaves package sizes in brackets alone", () => {
    expect(scaleLine("1 can (14 oz) sweetened condensed milk", 2)).toBe(
      "2 cans (14 oz) sweetened condensed milk",
    );
    expect(scaleLine("1 (15-ounce) can black beans", 2)).toBe(
      "2 (15-ounce) can black beans",
    );
  });

  it("keeps spelled-out unit words in step with the amount", () => {
    expect(scaleLine("1 cup milk", 2)).toBe("2 cups milk");
    expect(scaleLine("1 1/2 cups flour", 0.5)).toBe("¾ cup flour");
    expect(scaleLine("2 cloves garlic, minced", 0.5)).toBe(
      "1 clove garlic, minced",
    );
    expect(scaleLine("1 Tablespoon honey", 3)).toBe("3 Tablespoons honey");
    expect(scaleLine("1 tbsp olive oil", 2)).toBe("2 tbsp olive oil");
    expect(scaleLine("2 cans (15 oz) beans", 0.5)).toBe("1 can (15 oz) beans");
    expect(scaleLine("1 dash hot sauce", 2)).toBe("2 dashes hot sauce");
  });

  it("leaves lines without a quantity alone", () => {
    expect(scaleLine("Salt and pepper, to taste", 2)).toBe(
      "Salt and pepper, to taste",
    );
  });
});

describe("showLine", () => {
  const line = {
    raw: "4 garlic cloves, minced",
    quantity: 4,
    unit: "clove",
    name: "garlic",
    note: "minced",
    optional: false,
  };

  it("shows a line from its fields, scaled, with its note apart", () => {
    expect(showLine(line, 1)).toEqual({
      text: "4 cloves garlic",
      note: "minced",
      optional: false,
    });
    expect(showLine({ ...line, quantity: 0.5 }, 1).text).toBe("½ clove garlic");
    expect(showLine(line, 0.5).text).toBe("2 cloves garlic");
    expect(
      showLine(
        { ...line, quantity: null, unit: null, name: "Salt", note: "to taste" },
        2,
      ),
    ).toEqual({ text: "Salt", note: "to taste", optional: false });
  });

  it("falls back to the original line, scaled, when a line has no name", () => {
    expect(
      showLine(
        {
          ...line,
          raw: "2 **cups** flour",
          name: null,
          quantity: 2,
          unit: "cup",
        },
        2,
      ),
    ).toEqual({ text: "4 cups flour", note: null, optional: false });
  });
});
