import { describe, expect, it } from "bun:test";
import { PAGES } from "@/src/content/pages";
import { STEPS, wordMarks } from "@/src/content/steps";
import { TOPICS } from "@/src/content/topics";
import { WORDS } from "@/src/content/words";

describe("the walkthrough's steps", () => {
  it("gives every step its own link name, never reused", () => {
    const slugs = STEPS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("keeps every step to a title and at most three things on screen", () => {
    for (const step of STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.blocks.length).toBeGreaterThan(0);
      expect(step.blocks.length).toBeLessThanOrEqual(3);
    }
  });

  it("marks only words the glossary defines, each once per step", () => {
    for (const step of STEPS) {
      const marked = step.blocks.flatMap((block) =>
        block.kind === "text" ? wordMarks(block.text) : [],
      );
      for (const slug of marked) expect(slug in WORDS).toBe(true);
      expect(new Set(marked).size).toBe(marked.length);
    }
  });

  it("links only to pages and topics that exist", () => {
    const targets = new Set([
      ...PAGES.map((p) => p.slug),
      ...TOPICS.map((t) => t.slug),
    ]);
    for (const step of STEPS) {
      for (const block of step.blocks) {
        if (block.kind === "link") expect(targets.has(block.slug)).toBe(true);
      }
    }
  });
});

describe("wordMarks", () => {
  it("finds the glossary slugs marked in a step's text", () => {
    expect(
      wordMarks(
        "Track your [[net worth|net-worth]] and your [[budget|budget]].",
      ),
    ).toEqual(["net-worth", "budget"]);
    expect(wordMarks("No marks here.")).toEqual([]);
  });
});

describe("textParts", () => {
  it("splits a step's text into plain runs and marked words", async () => {
    const { textParts } = await import("@/src/content/steps");
    expect(textParts("Own minus owe is your [[net worth|net-worth]].")).toEqual(
      [
        { text: "Own minus owe is your " },
        { text: "net worth", word: "net-worth" },
        { text: "." },
      ],
    );
  });
});

describe("the tab title on the walkthrough", () => {
  it("names the step that's showing, and the first step at /start", async () => {
    const { pageNameFor } = await import("@/src/content/pages");
    expect(pageNameFor("/start/start-early-then-stop")).toBe(
      "Start early, then stop",
    );
    expect(pageNameFor("/start")).toBe(STEPS[0]?.title ?? "");
  });
});
