import { describe, expect, it } from "bun:test";
import { RESOURCES, resourcesByTopic } from "@/src/content/resources";
import { WORDS, wordsInOrder } from "@/src/content/words";

describe("the glossary", () => {
  it("defines every word in no more than two sentences", () => {
    for (const entry of Object.values(WORDS)) {
      const sentences = entry.definition
        .split(/[.!?](?:\s|$)/)
        .filter((part) => part.trim().length > 0);
      expect(sentences.length).toBeGreaterThan(0);
      expect(sentences.length).toBeLessThanOrEqual(2);
    }
  });

  it("gives each word one entry, with a slug its link can use", () => {
    const words = Object.values(WORDS).map((entry) => entry.word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
    for (const slug of Object.keys(WORDS)) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("lists the words alphabetically for /words", () => {
    const listed = wordsInOrder().map(({ entry }) => entry.word.toLowerCase());
    expect(listed).toEqual([...listed].sort((a, b) => a.localeCompare(b)));
    expect(listed.length).toBe(Object.keys(WORDS).length);
  });
});

describe("the resources page", () => {
  it("lists every resource exactly once under each topic it belongs to", () => {
    const listed = resourcesByTopic().flatMap(({ topic, resources }) =>
      resources.map((r) => `${topic.slug}:${r.title}`),
    );
    const expected = RESOURCES.flatMap((r) =>
      r.topics.map((slug) => `${slug}:${r.title}`),
    );
    expect([...listed].sort()).toEqual([...expected].sort());
  });
});
