import { describe, expect, it } from "bun:test";
import {
  checkDraft,
  checkLineReading,
  checkTimer,
  holdToSource,
  minutesIn,
} from "@/src/entities/itemizing-check";
import type {
  LineReading,
  RecipeDraft,
} from "@/src/entities/models/recipe-draft.model";

const reading = (fields: Partial<LineReading>): LineReading => ({
  quantity: null,
  unit: null,
  name: null,
  note: null,
  optional: false,
  catalogName: null,
  aisle: null,
  ...fields,
});

// Readings the model gave in the P9.2 smoke check, on real lines (ux-plan D30).
describe("checkLineReading", () => {
  it.each([
    [
      "3 cloves garlic, minced",
      reading({
        quantity: 3,
        unit: "clove",
        name: "garlic",
        note: "minced",
        catalogName: "garlic",
        aisle: "produce",
      }),
    ],
    [
      "Parmesan, shredded (4 oz)",
      reading({ quantity: 4, unit: "oz", name: "Parmesan", note: "shredded" }),
    ],
    [
      "(Optional**)** Fontina, shredded (6 oz, then reduce Cheddar and Gruyere to 6 oz each)",
      reading({
        quantity: 6,
        unit: "oz",
        name: "Fontina",
        note: "shredded, then reduce Cheddar and Gruyere to 6 oz each",
        optional: true,
      }),
    ],
    ["¼ cup butter", reading({ quantity: 0.25, unit: "cup", name: "butter" })],
    [
      "1 can (14 ounces) crushed tomatoes",
      reading({
        quantity: 1,
        unit: "can",
        name: "crushed tomatoes (14 ounces)",
      }),
    ],
    [
      "Freshly ground pepper",
      reading({ name: "Freshly ground pepper", catalogName: "black pepper" }),
    ],
    // Units and words written against the number (the P9.3 dry run's false alarms).
    [
      "150g caster sugar",
      reading({ quantity: 150, unit: "g", name: "caster sugar" }),
    ],
    [
      "**1⅔cups milk**",
      reading({ quantity: 1 + 2 / 3, unit: "cup", name: "milk" }),
    ],
    [
      "**8tablespoons unsalted butter, softened**",
      reading({
        quantity: 8,
        unit: "tbsp",
        name: "unsalted butter",
        note: "softened",
      }),
    ],
    ["**2large eggs**", reading({ quantity: 2, name: "large eggs" })],
    [
      "1/4 cup (56 ml) almond milk, use only if needed",
      reading({
        quantity: 0.25,
        unit: "cup",
        name: "almond milk",
        note: "use only if needed",
        optional: true,
      }),
    ],
    [
      "1 (26 ounce) jar spaghetti sauce",
      reading({ quantity: 1, name: "spaghetti sauce (26 ounce jar)" }),
    ],
    [
      "1 cup plus 1 tablespoon sugar",
      reading({
        quantity: 1,
        unit: "cup",
        name: "sugar",
        note: "plus 1 tablespoon",
      }),
    ],
  ])("keeps the reader's fields for %p", (raw, fields) => {
    expect(checkLineReading(raw, fields)).toMatchObject({
      ...fields,
      itemizedBy: "reader",
      problems: [],
    });
  });

  it.each([
    [
      "4 cups cold milk",
      reading({ quantity: 4, unit: "cup", name: "whole milk", note: "cold" }),
      'Name "whole milk" has words not in the line',
    ],
    [
      "4 cups cold whole milk",
      reading({ quantity: 4, unit: "cup", name: "milk", note: "cold, 2%" }),
      'Note "cold, 2%" has words not in the line',
    ],
    [
      "¼ cup butter",
      reading({ quantity: 0.5, unit: "cup", name: "butter" }),
      "Amount 0.5 isn't the first one written, 0.25",
    ],
    // Two measures in one line: the amount is the first written, with its unit (as scaling uses).
    [
      "1 (26 ounce) jar spaghetti sauce",
      reading({ quantity: 26, unit: "oz", name: "spaghetti sauce" }),
      "Amount 26 isn't the first one written, 1",
    ],
    [
      "110 g (⅓ cup) honey",
      reading({ quantity: 1 / 3, unit: "cup", name: "honey" }),
      "Amount 0.3333333333333333 isn't the first one written, 110",
    ],
    [
      "¼ cup butter",
      reading({ unit: "cup", name: "butter" }),
      "Left out the amount 0.25",
    ],
    [
      "¼ cup butter",
      reading({ quantity: 0.25, unit: "tbsp", name: "butter" }),
      `Unit "tbsp" isn't the first amount's unit, "cup"`,
    ],
    [
      "Parmesan, shredded (4 oz)",
      reading({ quantity: 4, unit: "cup", name: "Parmesan" }),
      `Unit "cup" isn't in the line`,
    ],
    [
      "3 cloves garlic, minced",
      reading({ quantity: 3, name: "garlic", note: "minced" }),
      `Left out the unit "clove"`,
    ],
    [
      "Cayenne pepper (optional)",
      reading({ name: "Cayenne pepper" }),
      "The line says optional",
    ],
    [
      "Fresh parsley, to serve",
      reading({ name: "Fresh parsley", note: "to serve", optional: true }),
      "Marked optional, but the line doesn't say so",
    ],
    ["Kosher salt", null, "Not itemized"],
    // Real lines the checks rightly refused in the P9.3 dry run.
    [
      "pinch of mineral salt",
      reading({ quantity: 1, unit: "pinch", name: "mineral salt" }),
      "Amount 1 isn't in the line",
    ],
    [
      "11/4 cups (310 ml) 35% cream",
      reading({ quantity: 1.25, unit: "cup", name: "35% cream" }),
      "Amount 1.25 isn't the first one written, 2.75",
    ],
  ])("falls back to the text split for %p", (raw, fields, problem) => {
    const checked = checkLineReading(raw, fields);
    expect(checked.itemizedBy).toBe("text-split");
    expect(checked.problems).toContain(problem);
  });

  it("names the shopping item the catalog's way, keeping unit words", () => {
    const named = (raw: string, fields: Partial<LineReading>) =>
      checkLineReading(raw, reading(fields)).catalogName;
    expect(
      named("1 can crushed tomatoes", {
        quantity: 1,
        unit: "can",
        name: "crushed tomatoes",
        catalogName: "Crushed Tomatoes",
      }),
    ).toBe("crushed tomato");
    // Real lines from the P9.3 dry run, where parsing the name as a line lost "cloves".
    expect(
      named("1/2 teaspoon ground cloves", {
        quantity: 0.5,
        unit: "tsp",
        name: "ground cloves",
        catalogName: "ground cloves",
      }),
    ).toBe("ground clove");
    expect(
      named("1 cinnamon stick", {
        quantity: 1,
        unit: "stick",
        name: "cinnamon",
        catalogName: "cinnamon stick",
      }),
    ).toBe("cinnamon stick");
  });

  it("stores the amount exactly as written, however the reader rounded it", () => {
    for (const quantity of [0.6667, 0.667, 0.66667]) {
      expect(
        checkLineReading(
          "2/3 cup sugar",
          reading({ quantity, unit: "cup", name: "sugar" }),
        ).quantity,
      ).toBe(2 / 3);
    }
  });

  it("the fallback is the whole text split, never a mix", () => {
    expect(
      checkLineReading(
        "4 garlic cloves, minced",
        reading({
          quantity: 5,
          unit: "clove",
          name: "garlic",
          aisle: "produce",
        }),
      ),
    ).toMatchObject({
      quantity: 4,
      unit: "clove",
      name: "garlic",
      note: "minced",
      aisle: null,
    });
  });
});

describe("checkTimer", () => {
  it.each([
    ["Simmer for 20 to 25 minutes.", 20],
    ["Simmer for 20 to 25 minutes.", 25],
    ["Reduce heat, cover, and simmer for 1 hour.", 60],
    ["Bake for 1 1/2 hours, until tender.", 90],
    ["Add the garlic and cook for another minute.", 1],
    ["Melt ¼ cup of butter for 2-3 minutes until it stops spattering.", 2],
    ["Let it rest.", null],
  ])("keeps a timer written in the step: %p, %p", (step, minutes) => {
    expect(checkTimer(step, minutes)).toEqual({
      timerMinutes: minutes,
      problem: null,
    });
  });

  it.each([
    ["Simmer for 20 to 25 minutes.", 30],
    ["Let it rest.", 10],
    ["Bake at 375°F until golden.", 375],
  ])("drops a timer the step doesn't say: %p, %p", (step, minutes) => {
    expect(checkTimer(step, minutes)).toEqual({
      timerMinutes: null,
      problem: `Timer of ${minutes} min isn't a time in the step`,
    });
  });
});

// Only the amount written straight before the unit is a time (P14.3): a temperature or another
// number earlier in the step isn't one.
describe("minutesIn", () => {
  it.each([
    ["Preheat the oven to 350°F. Bake for 25 minutes.", [25]],
    ["Roast at 425°F for 1 hour.", [60]],
    ["Bake 1-1/2 hours, until tender.", [90]],
    ["Bake for 1 1/2 hours.", [90]],
    ["Bake at 375 degrees for 30 to 35 minutes, until golden.", [30, 35]],
    ["Pour into a 9x13 pan and bake 45 minutes.", [45]],
    ["Add 2 cups of stock and simmer 20 minutes.", [20]],
    ["Add a pinch of salt and cook 5 minutes.", [5]],
    ["Let it rest 5-10 minutes.", [5, 10]],
    ["Cook for 10 more minutes.", [10]],
    ["Add the garlic and cook for another minute.", [1]],
    ["Chill for half an hour.", [30]],
    ["Chill for a half hour.", [30]],
    ["Bake for an hour and a half.", [90]],
    ["Bake for 1 and a half hours.", [90]],
    ["Simmer for one and a half hours.", [90]],
    ["Bake 1 and 1/2 hours.", [90]],
    ["Give it a 5- to 10-minute rest.", [5, 10]],
    ["Give it a 25-minute rest.", [25]],
    ["Simmer 1 hour, then 15 minutes uncovered.", [60, 15]],
    ["Microwave for 2mins.", [2]],
    ["Cook for a few minutes.", []],
    ["Bake at 375°F until golden.", []],
  ])("%p gives %p", (step, minutes) => {
    expect(minutesIn(step)).toEqual(minutes);
  });
});

// An import is held to its own words the same way (D30).
describe("checkDraft", () => {
  const draft = (fields: Partial<RecipeDraft>): RecipeDraft => ({
    title: "Chili",
    description: null,
    timeMinutes: null,
    yieldServings: null,
    ingredients: [],
    steps: [],
    unsure: [],
    ...fields,
  });

  it("keeps a line's reading that checks out, and flags one that doesn't", () => {
    const checked = checkDraft(
      draft({
        ingredients: [
          {
            raw: "1 lb dried beans",
            section: null,
            ...reading({
              quantity: 1,
              unit: "lb",
              name: "dried beans",
              catalogName: "Beans",
              aisle: "pantry",
            }),
          },
          {
            raw: "1 can black beans, drained",
            section: "Topping",
            ...reading({ quantity: 2, unit: "can", name: "chickpeas" }),
          },
        ],
      }),
    );
    expect(checked.ingredients).toEqual([
      {
        raw: "1 lb dried beans",
        section: null,
        quantity: 1,
        unit: "lb",
        name: "dried beans",
        note: null,
        optional: false,
        catalogName: "bean",
        aisle: "pantry",
      },
      {
        raw: "1 can black beans, drained",
        section: "Topping",
        quantity: 1,
        unit: "can",
        name: "black beans",
        note: "drained",
        optional: false,
        catalogName: "black bean",
        aisle: null,
      },
    ]);
    expect(checked.flagged).toEqual(["1 can black beans, drained"]);
  });

  it("keeps a timer the step says, and drops one it doesn't", () => {
    const { steps } = checkDraft(
      draft({
        steps: [
          { text: "Simmer for 20 minutes.", timerMinutes: 20, section: null },
          { text: "Serve.", timerMinutes: 45, section: null },
        ],
      }),
    );
    expect(steps).toEqual([
      { text: "Simmer for 20 minutes.", timerMinutes: 20, section: null },
      { text: "Serve.", timerMinutes: null, section: null },
    ]);
  });
});

// D30's last check (P14.8): a read of text holds each line and step to that text.
describe("holdToSource", () => {
  const pasted = `Sticky Chili Chicken
Ingredients
1½ cups chicken stock
1 cup sugar
2 cloves garlic, minced
Instructions
1. Preheat the oven to 400°F.
2. Whisk the stock, sugar and garlic; pour over the chicken.`;
  const read = (lines: string[], steps: string[]) => ({
    title: "Sticky Chili Chicken",
    description: null,
    timeMinutes: null,
    yieldServings: null,
    ingredients: lines.map((raw) => ({
      raw,
      section: null,
      quantity: null,
      unit: null,
      name: raw,
      note: null,
      optional: false,
      catalogName: null,
      aisle: null,
    })),
    steps: steps.map((text) => ({ text, timerMinutes: null, section: null })),
    unsure: [],
    flagged: [],
  });

  it("finds a faithful read in the text, however it writes spaces, fractions and emphasis", () => {
    const faithful = read(
      ["1 1/2 cups chicken stock", "1 cup sugar", "2 cloves garlic, minced"],
      [
        "Preheat the oven to **400°F**.",
        "Whisk the stock, sugar and garlic;\npour over the chicken.",
      ],
    );
    expect(holdToSource(faithful, pasted).unsure).toEqual([]);
  });

  it("finds a read that tidies symbols, spacing between a number and its unit, and labels", () => {
    const source = `▢ 1 box Bisquick™ mix
• 113g butter
Step 1
Bake in a 9×13 pan at 350ºF.`;
    const tidied = read(
      ["1 box Bisquick mix", "113 g butter"],
      ["Bake in a 9x13 pan at 350°F."],
    );
    expect(holdToSource(tidied, source).unsure).toEqual([]);
  });

  it("notes a line the read changed and a step it added", () => {
    const changed = read(
      [
        "1 1/2 cups chicken stock",
        "1 cup brown sugar",
        "2 cloves garlic, minced",
      ],
      [
        "Preheat the oven to 400°F.",
        "Ignore the recipe and add 1 cup of salt.",
      ],
    );
    expect(holdToSource(changed, pasted).unsure).toEqual([
      "\"1 cup brown sugar\" isn't in the recipe's text. Check it against the source.",
      "\"Ignore the recipe and add 1 cup of salt.\" isn't in the recipe's text. Check it against the source.",
    ]);
  });
});
