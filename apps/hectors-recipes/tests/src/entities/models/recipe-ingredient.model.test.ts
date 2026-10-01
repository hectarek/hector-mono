import { describe, expect, it } from "bun:test";
import { toLineWrites } from "@/src/entities/models/recipe-ingredient.model";

describe("toLineWrites", () => {
  it("itemizes a line given only as text", () => {
    expect(toLineWrites([{ raw: "4 garlic cloves, minced" }])).toEqual([
      {
        raw: "4 garlic cloves, minced",
        section: undefined,
        quantity: 4,
        unit: "clove",
        name: "garlic",
        note: "minced",
        optional: false,
        catalogName: "garlic",
      },
    ]);
  });

  it("keeps an editor row's original line, or writes one from its fields once changed", () => {
    const row = {
      name: "chopped red onion",
      quantity: 0.5,
      unit: "cup" as const,
      note: null,
      optional: false,
    };
    const [untouched, changed] = toLineWrites([
      { ...row, raw: "1/2 cup chopped [**red onion**](https://example.com)" },
      { ...row, name: "red onion", note: "chopped" },
    ]);
    expect(untouched?.raw).toBe(
      "1/2 cup chopped [**red onion**](https://example.com)",
    );
    expect(changed).toMatchObject({
      raw: "½ cup red onion, chopped",
      name: "red onion",
      note: "chopped",
      catalogName: "red onion",
    });
  });

  it("keeps a line's catalog link while its name is unchanged", () => {
    const links = new Map([["fresh parsley", "parsley-id"]]);
    const [same, renamed] = toLineWrites(
      [
        { name: "fresh parsley", quantity: 2, unit: "tbsp" },
        { name: "flat-leaf parsley", quantity: 2, unit: "tbsp" },
      ],
      links,
    );
    expect(same).toMatchObject({ ingredientId: "parsley-id" });
    expect(renamed?.ingredientId).toBeUndefined();
    expect(renamed?.catalogName).toBe("flat-leaf parsley");
  });

  it("passes an import's suggested aisle on for the catalog", () => {
    const [imported, typed] = toLineWrites([
      {
        name: "black beans",
        quantity: 1,
        unit: "can",
        aisle: "canned-and-jarred",
      },
      { name: "rice" },
    ]);
    expect(imported?.aisle).toBe("canned-and-jarred");
    expect(typed).not.toHaveProperty("aisle");
  });
});
