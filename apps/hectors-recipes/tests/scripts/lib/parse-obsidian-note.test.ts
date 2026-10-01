import { describe, expect, it } from "bun:test";
import {
  parseMinutes,
  parseObsidianNote,
} from "@/scripts/lib/parse-obsidian-note";

const STANDARD = `---
meal: ["Dinner"]
recipe_tags: ["Gluten-free", "Other"]
source: "https://www.kitchensanctuary.com/honey-garlic-chicken/"
cover: "![[Honey Garlic Chicken.webp]]"
time: "20 min"
created: 2025-04-20
---
# Honey Garlic Chicken

![[Honey Garlic Chicken.webp]]

## Ingredients

🍴 *Makes 4 serving/s*

---

- [ ]  8 chicken thighs - (skinless and boneless)
- [ ]  110 g (⅓ cup) honey

To Serve:

- [ ]  boiled rice

## Instructions

---

1. Place the chicken thighs in a bowl.
2. Serve with [[Rice|boiled rice]].
`;

const NYT = `---
meal: ["Dessert"]
---
# NYT Buns

# **INGREDIENTS**

### **FOR THE DOUGH**

- **1cup whole milk**
- **¼teaspoon salt**

### **FOR THE GLAZE**

- **2 tablespoons sugar**

## **PREPARATION**

1. **Step 1**

    Mix it.

## **COOKING NOTES**

### **Some Reader, 6 years ago**

Loved these.
`;

describe("parseObsidianNote", () => {
  it("parses the standard vault layout", () => {
    const parsed = parseObsidianNote("Honey Garlic Chicken.md", STANDARD);
    if (!parsed.ok) throw new Error(parsed.reason);
    const { recipe } = parsed;

    expect(recipe.title).toBe("Honey Garlic Chicken");
    expect(recipe.tags).toEqual(["dinner", "gluten-free"]);
    expect(recipe.sourceUrl).toBe(
      "https://www.kitchensanctuary.com/honey-garlic-chicken/",
    );
    expect(recipe.imageUrl).toBeNull();
    expect(recipe.timeMinutes).toBe(20);
    expect(recipe.yieldServings).toBe(4);
    expect(recipe.externalRef).toBe("obsidian:Honey Garlic Chicken.md");
    expect(recipe.ingredients).toEqual([
      { raw: "8 chicken thighs - (skinless and boneless)" },
      { raw: "110 g (⅓ cup) honey" },
      { raw: "boiled rice", section: "To Serve" },
    ]);
    expect(recipe.instructions).toContain(
      "1. Place the chicken thighs in a bowl.",
    );
    expect(recipe.instructions).toContain("Serve with boiled rice.");
    expect(recipe.instructions).not.toContain("---\n1.");
  });

  it("handles NYT clippings: H1 ingredients, H3 sub-sections, reader comments dropped", () => {
    const parsed = parseObsidianNote("NYT Buns.md", NYT);
    if (!parsed.ok) throw new Error(parsed.reason);

    expect(parsed.recipe.ingredients).toEqual([
      { raw: "**1cup whole milk**", section: "FOR THE DOUGH" },
      { raw: "**¼teaspoon salt**", section: "FOR THE DOUGH" },
      { raw: "**2 tablespoons sugar**", section: "FOR THE GLAZE" },
    ]);
    expect(parsed.recipe.instructions).toContain("Mix it.");
    expect(parsed.recipe.instructions).not.toContain("Some Reader");
  });

  it("skips notes without an ingredients section, with a reason", () => {
    expect(
      parseObsidianNote("Mapo Tofu.md", "# Mapo Tofu\n\nhttps://youtu.be/x"),
    ).toEqual({
      ok: false,
      title: "Mapo Tofu",
      reason: "no ingredients section",
    });
  });
});

describe("parseMinutes", () => {
  it.each([
    ["20 min", 20],
    ["1 hr 30 min", 90],
    ["1.5 hours", 90],
    ["45", 45],
    ["", null],
    ["overnight", null],
  ])("%p → %p", (value, expected) => {
    expect(parseMinutes(value)).toBe(expected);
  });
});
