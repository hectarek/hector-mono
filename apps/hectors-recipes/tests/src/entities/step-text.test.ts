import { describe, expect, it } from "bun:test";
import {
  sectionTitle,
  stepGroups,
  stepsFromMarkdown,
  withSections,
} from "@/src/entities/step-text";

// The shapes in Hector's recipes (ux-plan D24): 60 numbered lists, and NYT prose under
// "### Step N" headings.
describe("stepsFromMarkdown", () => {
  it("makes each numbered item a step, keeping its wrapped lines and inline markdown", () => {
    expect(
      stepsFromMarkdown(
        "1. Heat the oil in a **large** pan.\n2. Add the onion and cook until soft,\n   about 5 minutes.\n\n3. Serve.",
      ),
    ).toEqual([
      "Heat the oil in a **large** pan.",
      "Add the onion and cook until soft, about 5 minutes.",
      "Serve.",
    ]);
  });

  it("makes each paragraph a step when there's no list, dropping 'Step N' headings", () => {
    expect(
      stepsFromMarkdown(
        "### Step 1\n\nHeat oven to 350 degrees. Spread the bread cubes.\n\n### Step 2\n\nMelt the butter.",
      ),
    ).toEqual([
      "Heat oven to 350 degrees. Spread the bread cubes.",
      "Melt the butter.",
    ]);
  });

  it("keeps a paragraph between lists as its own step, not the end of the one before", () => {
    // Babish Mac n Cheese: two methods, each under a bold label.
    expect(
      stepsFromMarkdown(
        "**Baked Mac & Cheese Method:**\n\n1. Cook the pasta.\n2. Let sit and rest for 10 minutes before serving. \n\n**Bechamel/Mornay Sauce Method:**\n\n1. Melt the butter.",
      ),
    ).toEqual([
      "**Baked Mac & Cheese Method:**",
      "Cook the pasta.",
      "Let sit and rest for 10 minutes before serving.",
      "**Bechamel/Mornay Sauce Method:**",
      "Melt the butter.",
    ]);
  });

  it("drops bold 'Step N' labels and dividers", () => {
    // NYT Marshmallow and Whipped Cream-Filled Doughnuts.
    expect(
      stepsFromMarkdown(
        "---\n\n1. **Step 1**\n    \n    Lightly oil a baking dish.\n    \n2. **Step 2**\n    \n    Combine the sugar.\n\n**TIP**",
      ),
    ).toEqual(["Lightly oil a baking dish.", "Combine the sugar.", "**TIP**"]);
  });

  it("gives nothing for empty instructions", () => {
    expect(stepsFromMarkdown("  \n ")).toEqual([]);
  });

  // Pasted text often has single line breaks (P14.7).
  it("splits a bold heading straight after a numbered line into a step of its own", () => {
    expect(
      stepsFromMarkdown(
        "**Sauce:**\n1. Melt the butter.\n2. Whisk in flour.\n**Pasta:**\n3. Boil the pasta.",
      ),
    ).toEqual([
      "**Sauce:**",
      "Melt the butter.",
      "Whisk in flour.",
      "**Pasta:**",
      "Boil the pasta.",
    ]);
    expect(
      stepsFromMarkdown("For the sauce:\nMelt the butter.\n\nWhisk."),
    ).toEqual(["For the sauce:", "Melt the butter.", "Whisk."]);
  });

  it("reads a list item ending in a colon as the item, without its marker", () => {
    expect(
      stepsFromMarkdown("- For the sauce:\n- Melt butter.\n- Whisk in flour."),
    ).toEqual(["For the sauce:", "Melt butter.", "Whisk in flour."]);
    expect(stepsFromMarkdown("1) For the sauce:\n2) Melt butter.")).toEqual([
      "For the sauce:",
      "Melt butter.",
    ]);
    expect(
      stepsFromMarkdown(
        "- Whisk together:\n  - flour\n  - sugar\n- Bake 20 minutes.",
      ),
    ).toEqual(["Whisk together: - flour - sugar", "Bake 20 minutes."]);
  });

  it("keeps a wrapped line that ends in a colon in its step", () => {
    expect(
      stepsFromMarkdown(
        "Cream the butter and sugar until fluffy, then\nadd the following in order:\neggs, vanilla and the flour mixture.",
      ),
    ).toEqual([
      "Cream the butter and sugar until fluffy, then add the following in order: eggs, vanilla and the flour mixture.",
    ]);
  });

  it("drops plain 'Step N:' labels like the others", () => {
    expect(stepsFromMarkdown("Step 1:\nMix.\n\nStep 2:\nBake.")).toEqual([
      "Mix.",
      "Bake.",
    ]);
  });

  it("keeps a markdown heading as a bold step, for withSections to make a section", () => {
    expect(
      stepsFromMarkdown("## For the sauce\n\n1. Melt the butter."),
    ).toEqual(["**For the sauce**", "Melt the butter."]);
  });
});

// The headings in Hector's recipes (ux-plan D35, P12.1).
describe("sectionTitle", () => {
  it("reads a bold-only step as a heading, without its bold or colon", () => {
    expect(sectionTitle("**Bechamel/Mornay Sauce Method:**")).toBe(
      "Bechamel/Mornay Sauce Method",
    );
    expect(sectionTitle("**Caramelized Bananas**:")).toBe(
      "Caramelized Bananas",
    );
    expect(sectionTitle("**TIP**")).toBe("TIP");
  });

  it("reads a short plain line ending in a colon as a heading", () => {
    expect(sectionTitle("For the sauce:")).toBe("For the sauce");
    expect(sectionTitle("To serve:")).toBe("To serve");
  });

  it("leaves a real step alone, bold words and all", () => {
    expect(sectionTitle("**Don't overmix!**")).toBeNull();
    expect(sectionTitle("**Bake until golden.**")).toBeNull();
    expect(
      sectionTitle("Preheat the oven. Whisk together the following:"),
    ).toBeNull();
    expect(sectionTitle("Whisk in the **cold** milk.")).toBeNull();
    expect(sectionTitle("**Don't** skip the resting time.")).toBeNull();
    expect(
      sectionTitle(
        "**Let the dough rest in the fridge overnight so the gluten relaxes.**",
      ),
    ).toBeNull();
  });
});

describe("stepGroups", () => {
  it("runs steps that share a section together, numbering on across them", () => {
    const step = (text: string, section: string | null) => ({ text, section });
    const groups = stepGroups([
      step("Prep.", null),
      step("Cook the pasta.", "Mac"),
      step("Bake.", "Mac"),
      step("Melt the butter.", "Sauce"),
    ]);
    expect(
      groups.map(({ section, first, steps }) => [
        section,
        first,
        steps.map((s) => s.text),
      ]),
    ).toEqual([
      [null, 1, ["Prep."]],
      ["Mac", 2, ["Cook the pasta.", "Bake."]],
      ["Sauce", 4, ["Melt the butter."]],
    ]);
    expect(stepGroups([])).toEqual([]);
  });
});

describe("withSections", () => {
  it("makes a heading the section of the steps after it", () => {
    expect(
      withSections([
        "**Baked Mac & Cheese Method:**",
        "Cook the pasta.",
        "Bake.",
        "**Bechamel/Mornay Sauce Method:**",
        "Melt the butter.",
      ]),
    ).toEqual([
      { text: "Cook the pasta.", section: "Baked Mac & Cheese Method" },
      { text: "Bake.", section: "Baked Mac & Cheese Method" },
      { text: "Melt the butter.", section: "Bechamel/Mornay Sauce Method" },
    ]);
  });

  it("keeps a heading with no step of its own as a step, so nothing is lost", () => {
    expect(withSections(["Chill.", "**TIP**"])).toEqual([
      { text: "Chill.", section: null },
      { text: "**TIP**", section: null },
    ]);
    expect(withSections(["**Notes**", "**Sauce**", "Whisk."])).toEqual([
      { text: "**Notes**", section: null },
      { text: "Whisk.", section: "Sauce" },
    ]);
  });
});
