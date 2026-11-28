import { SITE_NAME } from "@/src/site";
import { STEPS } from "./steps";
import { TOPICS, type TopicSlug } from "./topics";

type PageKind =
  | "walkthrough"
  | "explainer"
  | "calculator"
  | "glossary"
  | "resources";

type SitePage = {
  slug: string;
  title: string;
  summary: string;
  kind: PageKind;
  topic: TopicSlug | null;
  readFirst: readonly string[];
};

// Every page of the site's own, each at its own top-level link (/mortgage). Adding a page means
// an entry here, its folder under app/, and its preview (bun scripts/render-previews.ts).
// A slug is a link people have been sent, so it never changes or gets reused.
export const PAGES: readonly SitePage[] = [
  {
    slug: "start",
    title: "Start here",
    summary: "A short walk through how money works, one idea at a time.",
    kind: "walkthrough",
    topic: "basics",
    readFirst: [],
  },
  {
    slug: "compound-growth",
    title: "Watch your money grow",
    summary:
      "Put in a little at a time and see what it turns into, with the math shown.",
    kind: "calculator",
    topic: "investing",
    readFirst: [],
  },
  {
    slug: "words",
    title: "Money words, in plain English",
    summary:
      "Every money word this site uses, each explained in a sentence or two.",
    kind: "glossary",
    topic: null,
    readFirst: [],
  },
  {
    slug: "resources",
    title: "Where to learn more",
    summary:
      "The free courses, calculators and books worth your time, and why each one is.",
    kind: "resources",
    topic: null,
    readFirst: [],
  },
];

export const HOME_LINE =
  "Money, explained in plain words, with tools to try the numbers.";

// What each link preview shows: the home page, every topic and every page (KTD5).
export const PREVIEW_CARDS: readonly {
  slug: string;
  title: string;
  line: string;
}[] = [
  { slug: "home", title: SITE_NAME, line: HOME_LINE },
  ...TOPICS.map((t) => ({ slug: t.slug, title: t.name, line: t.line })),
  ...PAGES.map((p) => ({ slug: p.slug, title: p.title, line: p.summary })),
];

// The name the tab title shows for a path, or null for the home page and unknown paths.
export function pageNameFor(path: string): string | null {
  const [, slug = "", step, ...rest] = path.split("/");
  if (rest.length > 0) {
    return null;
  }
  if (slug === "start") {
    const shown =
      step === undefined ? STEPS[0] : STEPS.find((s) => s.slug === step);
    return shown?.title ?? null;
  }
  if (step !== undefined) {
    return null;
  }
  return (
    TOPICS.find((t) => t.slug === slug)?.name ??
    PAGES.find((p) => p.slug === slug)?.title ??
    null
  );
}
