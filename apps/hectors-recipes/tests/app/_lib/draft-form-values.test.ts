import { describe, expect, it } from "bun:test";
import { draftFormValues } from "@/app/_lib/draft-form-values";
import type { LineRow } from "@/src/entities/editor-rows";
import type { CheckedDraft } from "@/src/entities/itemizing-check";

describe("draftFormValues", () => {
  const draft: CheckedDraft = {
    title: "Chili",
    description: null,
    timeMinutes: 45,
    yieldServings: null,
    ingredients: [
      {
        raw: "1 can black beans, drained",
        section: "Beans",
        quantity: 1,
        unit: "can",
        name: "black beans",
        note: "drained",
        optional: false,
        catalogName: "black bean",
        aisle: "canned-and-jarred",
      },
    ],
    steps: [
      { text: "Simmer for 20 minutes.", timerMinutes: 20, section: "Soup" },
    ],
    unsure: ["The oven temperature is smudged."],
    flagged: [],
  };

  it("fills the form's fields and rows from the draft, as untouched rows", () => {
    const { values, review } = draftFormValues(draft, {
      sourceUrl: "https://example.com/chili",
      imageUrl: "https://example.com/chili.jpg",
    });
    expect(values).toMatchObject({
      title: "Chili",
      description: "",
      timeMinutes: "45",
      yieldServings: "",
      tags: [],
      sourceUrl: "https://example.com/chili",
      imageUrl: "https://example.com/chili.jpg",
    });
    const [section, line] = values.ingredients;
    expect(section).toMatchObject({ kind: "section", title: "Beans" });
    expect(line as LineRow).toMatchObject({
      raw: "1 can black beans, drained",
      amount: "1",
      unit: "can",
      name: "black beans",
      note: "drained",
      aisle: "canned-and-jarred",
    });
    expect(values.steps).toMatchObject([
      { kind: "section", title: "Soup" },
      { kind: "step", text: "Simmer for 20 minutes.", timer: "20" },
    ]);
    expect(review).toEqual({
      unsure: ["The oven temperature is smudged."],
      flagged: [],
    });
  });
});
