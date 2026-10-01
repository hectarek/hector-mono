import { describe, expect, it } from "bun:test";
import {
  amountsIn,
  type ParsedIngredientLine,
  parseIngredientLine,
} from "@/src/entities/ingredient-line";

// Real lines from the Obsidian recipe vault.
const VAULT_LINES: [string, ParsedIngredientLine][] = [
  [
    "1 teaspoon dried oregano",
    { quantity: 1, unit: "tsp", name: "dried oregano" },
  ],
  [
    "1/2 cup unsweetened applesauce",
    { quantity: 0.5, unit: "cup", name: "unsweetened applesauce" },
  ],
  [
    "1 1/2 cups all-purpose flour",
    { quantity: 1.5, unit: "cup", name: "all-purpose flour" },
  ],
  ["½ tsp salt", { quantity: 0.5, unit: "tsp", name: "salt" }],
  [
    "¼ cup low-sodium soy sauce",
    { quantity: 0.25, unit: "cup", name: "low-sodium soy sauce" },
  ],
  ["400g cooked lentils", { quantity: 400, unit: "g", name: "cooked lentil" }],
  ["110 g (⅓ cup) honey", { quantity: 110, unit: "g", name: "honey" }],
  // NYT writes the metric measure after a slash, against the unit.
  [
    "**1½cups/302 grams granulated sugar**",
    { quantity: 1.5, unit: "cup", name: "granulated sugar" },
  ],
  [
    "1 (15-ounce) can black beans, drained and rinsed",
    { quantity: 1, unit: "can", name: "black bean" },
  ],
  [
    "1 can (14 oz) sweetened condensed milk",
    { quantity: 1, unit: "can", name: "sweetened condensed milk" },
  ],
  [
    "1 (16 ounce) package ziti pasta",
    { quantity: 1, unit: "package", name: "ziti pasta" },
  ],
  [
    "1 cup (2 sticks) unsalted butter, softened",
    { quantity: 1, unit: "cup", name: "unsalted butter" },
  ],
  ["1/4 teaspoon (1 ml) salt", { quantity: 0.25, unit: "tsp", name: "salt" }],
  [
    "2 tbsp cornflour - (cornstarch)",
    { quantity: 2, unit: "tbsp", name: "cornflour" },
  ],
  [
    "8 chicken thighs - (skinless and boneless)",
    { quantity: 8, unit: null, name: "chicken thigh" },
  ],
  [
    "1 1/2 pounds boneless skinless chicken tenders",
    { quantity: 1.5, unit: "lb", name: "boneless skinless chicken tender" },
  ],
  ["1 large onion, diced", { quantity: 1, unit: null, name: "onion" }],
  ["6 large eggs", { quantity: 6, unit: null, name: "egg" }],
  [
    "2 medium sweet potatoes, peeled and diced",
    { quantity: 2, unit: null, name: "sweet potato" },
  ],
  ["2 bay leaves", { quantity: 2, unit: null, name: "bay leaf" }],
  [
    "1/2 cup fresh or frozen berries (optional)",
    { quantity: 0.5, unit: "cup", name: "fresh or frozen berry" },
  ],
  [
    "1 cup cooked black beans (or 1 can, drained and rinsed)",
    { quantity: 1, unit: "cup", name: "cooked black bean" },
  ],
  [
    "1 1/2 cup [puffed quinoa](https://nuts.com/cookingbaking/grains/quinoa/puffs.html)",
    { quantity: 1.5, unit: "cup", name: "puffed quinoa" },
  ],
  [
    "1 tablespoon [**Italian seasoning**](https://amzn.to/2P1eKju)",
    { quantity: 1, unit: "tbsp", name: "italian seasoning" },
  ],
  [
    "pinch of mineral salt",
    { quantity: null, unit: "pinch", name: "mineral salt" },
  ],
];

// Real lines from recipe pages (the L4 check, ux-plan): a can's size written before it,
// unbracketed, and Taste of Home's "2-2/3" for two and two-thirds.
const PAGE_LINES: [string, ParsedIngredientLine][] = [
  [
    "28-ounce can diced tomatoes, San Marzano if possible",
    { quantity: 1, unit: "can", name: "diced tomato" },
  ],
  [
    "1 15-oz. can chickpeas, rinsed and drained (1½ cups)",
    { quantity: 1, unit: "can", name: "chickpea" },
  ],
  [
    "2 15.5-oz. cans cannellini beans, drained, rinsed",
    { quantity: 2, unit: "can", name: "cannellini bean" },
  ],
  [
    "2 15 ounce cans salt-free kidney beans",
    { quantity: 2, unit: "can", name: "salt-free kidney bean" },
  ],
  [
    "1 15oz. can black beans, well rinsed",
    { quantity: 1, unit: "can", name: "black bean" },
  ],
  [
    "2-2/3 cups hot cooked brown rice",
    { quantity: 2 + 2 / 3, unit: "cup", name: "hot cooked brown rice" },
  ],
  [
    "1 1/2-2 cups sugar (depending on how sweet you want to have the punch)",
    { quantity: 2, unit: "cup", name: "sugar" },
  ],
  [
    "1 12-oz. bottle hard cider or lager-style beer",
    {
      quantity: 1,
      unit: null,
      name: "12-oz. bottle hard cider or lager-style beer",
    },
  ],
];

const NO_QUANTITY: [string, string][] = [
  ["Salt and pepper, to taste", "salt and pepper"],
  ["Salt and pepper to taste", "salt and pepper"],
  [
    "[**Salt**](https://amzn.to/2Bq7vJW) and [**pepper**](https://amzn.to/2qtyNwH) to taste",
    "salt and pepper",
  ],
  ["Kosher salt, to taste", "kosher salt"],
  ["Grated Parmesan cheese for garnish", "grated parmesan cheese"],
  ["Cooked rice, for serving", "cooked rice"],
  ["Fresh parsley, chopped (optional)", "fresh parsley"],
  ["Sugar", "sugar"],
];

describe("parseIngredientLine", () => {
  it.each(VAULT_LINES)("parses %p", (raw, expected) => {
    expect(parseIngredientLine(raw)).toEqual(expected);
  });

  it.each(PAGE_LINES)("parses %p", (raw, expected) => {
    expect(parseIngredientLine(raw)).toEqual(expected);
  });

  it.each(NO_QUANTITY)("leaves quantity empty for %p", (raw, name) => {
    expect(parseIngredientLine(raw)).toEqual({
      quantity: null,
      unit: null,
      name,
    });
  });

  describe("garlic written three ways parses to the same thing", () => {
    it.each([
      ["2 cloves garlic, minced"],
      ["2 garlic cloves"],
      ["2 garlic cloves, crushed"],
    ])("%p", (raw) => {
      expect(parseIngredientLine(raw)).toEqual({
        quantity: 2,
        unit: "clove",
        name: "garlic",
      });
    });
  });

  it("takes the upper value of a range", () => {
    expect(parseIngredientLine("2-3 tbsp maple syrup").quantity).toBe(3);
    expect(parseIngredientLine("1 to 2 cups water").quantity).toBe(2);
  });

  it("handles a unicode fraction attached to a whole number", () => {
    expect(parseIngredientLine("1½ cups milk").quantity).toBe(1.5);
  });

  it("distinguishes T (tablespoon) from t (teaspoon)", () => {
    expect(parseIngredientLine("1 T butter").unit).toBe("tbsp");
    expect(parseIngredientLine("1 t vanilla").unit).toBe("tsp");
  });

  it("recognizes fluid ounces separately from weight ounces", () => {
    expect(parseIngredientLine("4 fl oz cream").unit).toBe("fl-oz");
    expect(parseIngredientLine("4 oz cream cheese").unit).toBe("oz");
  });

  it("never throws on odd input", () => {
    for (const raw of ["", "   ", "(", "1/0 cup flour", "~", "0 cups water"]) {
      expect(() => parseIngredientLine(raw)).not.toThrow();
    }
    expect(parseIngredientLine("0 cups water").quantity).toBeNull();
    expect(parseIngredientLine("1/0 cup flour").quantity).toBeNull();
  });
});

describe("amountsIn", () => {
  it.each([
    ["2-2/3 cups rice", [2 + 2 / 3]],
    ["1-1/2 hours", [1.5]],
    ["1/2-1 cup", [0.5, 1]],
    ["2-3 cups (16 oz)", [2, 3, 16]],
    ["1 1/2 cups", [1.5]],
    ["1½ cups", [1.5]],
  ])("%p gives %p", (text, amounts) => {
    expect(amountsIn(text)).toEqual(amounts);
  });
});
