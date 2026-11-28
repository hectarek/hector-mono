import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@/app/sitemap";
import { PAGES } from "@/src/content/pages";
import { RESOURCES } from "@/src/content/resources";
import { TOPICS } from "@/src/content/topics";
import { SITE_URL } from "@/src/site";

const APP = join(import.meta.dir, "../../app");

describe("the content list", () => {
  it("gives no two topics or pages the same link", () => {
    const slugs = [...TOPICS.map((t) => t.slug), ...PAGES.map((p) => p.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a page folder for every page", () => {
    for (const page of PAGES) {
      expect(existsSync(join(APP, page.slug, "page.tsx"))).toBe(true);
    }
  });

  it("points every read-first link at a real page", () => {
    const slugs = new Set(PAGES.map((p) => p.slug));
    for (const page of PAGES) {
      for (const slug of page.readFirst) expect(slugs.has(slug)).toBe(true);
    }
  });

  it("gives every resource a note, and every link https with its checked date or null", () => {
    for (const resource of RESOURCES) {
      expect(resource.note.length).toBeGreaterThan(0);
      if (resource.link) {
        expect(resource.link.url.startsWith("https://")).toBe(true);
        if (resource.link.checked !== null) {
          expect(resource.link.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it("keeps Credit and Taxes as topics with outside resources only, for now", () => {
    for (const slug of ["credit", "taxes"] as const) {
      expect(PAGES.filter((p) => p.topic === slug)).toEqual([]);
      expect(RESOURCES.some((r) => r.topics.includes(slug))).toBe(true);
    }
  });
});

describe("the sitemap", () => {
  it("lists the home page, every topic and every page once, at absolute addresses", () => {
    const urls = sitemap().map((entry) => entry.url);
    const expected = [
      `${SITE_URL}/`,
      ...TOPICS.map((t) => `${SITE_URL}/${t.slug}`),
      ...PAGES.map((p) => `${SITE_URL}/${p.slug}`),
    ];
    expect([...urls].sort()).toEqual([...expected].sort());
  });
});
