import { itemizeLine } from "./ingredient-item";
import { type CheckedDraft, minutesIn } from "./itemizing-check";
import type { RecipeDraft } from "./models/recipe-draft.model";
import { stepsFromMarkdown } from "./step-text";

// A recipe page's own recipe data (schema.org Recipe, as JSON-LD), read without AI
// (ux-plan P10.3). Most recipe sites publish it for search engines. The shapes handled here
// are the ones on the sites Hector's recipes come from: the recipe on its own, in a list, in
// an @graph or as a page's mainEntity; steps as text, HowToSteps or HowToSections.
export type PageRecipe = { draft: CheckedDraft; imageUrl: string | null };

// How much of a page without recipe data the AI reader is given.
const PAGE_TEXT_LIMIT = 30_000;

// How much of a page's recipe data is read. It's read without AI or a rate limit, so every
// field is cut to well past any real recipe's before it's parsed (P14 review): a line, a
// step, all the steps, the title and description, the yield, and how many lines and steps.
const LIMITS = {
  line: 300,
  lines: 150,
  step: 3_000,
  steps: 150,
  instructions: 30_000,
  text: 2_000,
  yield: 100,
};

// `pageUrl` is the page's address, for a photo given as a path relative to it.
export function recipeFromPage(
  html: string,
  pageUrl?: string,
): PageRecipe | null {
  const recipe = findRecipe(jsonLdBlocks(html));
  if (!recipe) return null;
  const lines = asList(recipe.recipeIngredient ?? recipe.ingredients)
    .slice(0, LIMITS.lines)
    .map((line) => cleanLine(line.slice(0, LIMITS.line)))
    .filter(Boolean);
  if (!lines.length) return null;

  const prep = durationMinutes(recipe.prepTime);
  const cook = durationMinutes(recipe.cookTime);
  return {
    draft: {
      title: plain(capped(recipe.name, LIMITS.text)) || "Untitled recipe",
      description: plain(capped(recipe.description, LIMITS.text)) || null,
      timeMinutes:
        durationMinutes(recipe.totalTime) ??
        (prep === null && cook === null ? null : (prep ?? 0) + (cook ?? 0)),
      yieldServings: servingsFrom(recipe.recipeYield),
      ingredients: lines.map((raw) => ({
        raw,
        section: null,
        ...itemizeLine(raw),
        aisle: null,
      })),
      steps: stepsFrom(recipe.recipeInstructions, null).slice(0, LIMITS.steps),
      unsure: [],
      flagged: [],
    },
    imageUrl: imageUrl(recipe.image, pageUrl),
  };
}

// An ISO 8601 duration ("PT1H5M", "P0DT2H30M") in whole minutes; null for none or nonsense.
export function durationMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
      value.trim(),
    );
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match.map(Number);
  const total =
    (days || 0) * 1440 +
    (hours || 0) * 60 +
    (minutes || 0) +
    Math.round((seconds || 0) / 60);
  return total > 0 ? total : null;
}

// The servings in a yield: "4", "4.0", "4 servings", "18 serving(s)", "Serves 4-6" (the
// first), "Serves: 4", "Servings: 6", "Makes 4 servings". A yield that counts something else
// ("Makes 1 loaf", "24 cookies", or "Makes 24" with no word for what) isn't servings.
const SERVINGS =
  /^\s*(?:(?:serves|servings|yield)\s*:?\s*)?(\d+)(?:\.0+)?(?:\s*(?:-|–|to)\s*\d+)?\s*(?:servings?|serving\(s\)|people|portions?)?\s*$/i;
const MAKES_SERVINGS =
  /^\s*makes\s*:?\s*(\d+)(?:\s*(?:-|–|to)\s*\d+)?\s+(?:servings?|people|portions?)\s*$/i;

export function servingsFrom(value: unknown): number | null {
  for (const item of Array.isArray(value) ? value : [value]) {
    if (typeof item === "number" && Number.isInteger(item) && item > 0) {
      return item;
    }
    if (typeof item !== "string") continue;
    // Short and with single spaces, so neither pattern can backtrack far.
    const text = item.slice(0, LIMITS.yield).replace(/\s+/g, " ");
    const match = SERVINGS.exec(text) ?? MAKES_SERVINGS.exec(text);
    if (match && Number(match[1]) > 0) return Number(match[1]);
  }
  return null;
}

// What a person would read on the page, a line per block, for the AI reader when the page has
// no recipe data. Scripts, styles and the <head> go; the rest is capped at `limit`.
export function pageText(html: string, limit = PAGE_TEXT_LIMIT): string {
  const text = decodeEntities(
    withoutHidden(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(BLOCK_TAG, "\n")
      .replace(TAG, " "),
  );
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, limit);
}

// Page text is untrusted and up to 3 MB, so the patterns run over the whole page are linear
// (P14.1): a tag's insides stop at the next "<", and an element's end is searched for once.
// Recipe data's fields are also cut short before they're parsed (LIMITS).
const TAG = /<[^<>]+>/g;
const BLOCK_TAG =
  /<\/?(?:p|div|li|ul|ol|h[1-6]|tr|td|th|section|article|header|footer|nav|main|aside|figure|figcaption|blockquote|pre|table|dt|dd)\b[^<>]*>/gi;

// The page less what a person doesn't see: the <head>, scripts, styles, drawings and
// comments. A <head> left open ends where the <body> starts; anything else that never closes
// runs to the end of the page, as in a browser.
function withoutHidden(html: string): string {
  const opening = /<(head|script|style|noscript|svg|template)\b[^<>]*>|<!--/gi;
  const kept: string[] = [];
  let from = 0;
  for (let open = opening.exec(html); open; open = opening.exec(html)) {
    kept.push(html.slice(from, open.index));
    const name = open[1]?.toLowerCase();
    const closing =
      name === "head"
        ? /<\/head\s*>|(?=<body\b)/gi
        : name
          ? new RegExp(`</${name}\\s*>`, "gi")
          : /-->/g;
    closing.lastIndex = opening.lastIndex;
    if (!closing.exec(html)) return kept.join("");
    from = opening.lastIndex = closing.lastIndex;
  }
  kept.push(html.slice(from));
  return kept.join("");
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Each <script type="application/ld+json">'s data, its end searched for once (see TAG).
function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const opening = /<script\b([^<>]*)>/gi;
  for (let open = opening.exec(html); open; open = opening.exec(html)) {
    const closing = /<\/script\s*>/gi;
    closing.lastIndex = opening.lastIndex;
    const close = closing.exec(html);
    if (!close) break;
    if (/type\s*=\s*["']?application\/ld\+json/i.test(open[1] ?? "")) {
      const block = parseJson(html.slice(opening.lastIndex, close.index));
      if (block !== undefined) blocks.push(block);
    }
    opening.lastIndex = closing.lastIndex;
  }
  return blocks;
}

// A block's data, or undefined when it's broken (another may hold the recipe). Some sites
// leave raw line breaks or tabs inside strings, which JSON doesn't allow; as spaces they
// parse, and they're only whitespace anywhere else.
function parseJson(text: string): unknown {
  for (const attempt of [text, text.replace(/[\n\r\t\f\v]+/g, " ")]) {
    try {
      return JSON.parse(attempt);
    } catch {
      // Try the next way, or give up.
    }
  }
  return undefined;
}

function types(node: Json): string[] {
  const type = node["@type"];
  return (Array.isArray(type) ? type : [type]).flatMap((item) =>
    typeof item === "string" ? [item.toLowerCase()] : [],
  );
}

function findRecipe(value: unknown, depth = 0): Json | null {
  if (depth > 4) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (types(value).includes("recipe")) return value;
  return (
    findRecipe(value["@graph"], depth + 1) ??
    findRecipe(value.mainEntity, depth + 1)
  );
}

function asList(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string",
  );
}

// A string field cut to `limit` characters; anything else as it is, for `plain` to drop.
function capped(value: unknown, limit: number): unknown {
  return typeof value === "string" ? value.slice(0, limit) : value;
}

// Text without tags or entities, on one line.
function plain(value: unknown): string {
  return typeof value === "string"
    ? decodeEntities(value.replace(TAG, " ")).replace(/\s+/g, " ").trim()
    : "";
}

// A line as written, less the prices Budget Bytes adds: "¼ cup brown sugar ($0.12)",
// "black pepper (freshly cracked, $0.05)".
function cleanLine(line: string): string {
  return plain(line)
    .replace(/,?\s*\$\s*\d+(?:\.\d+)?\*?(?=\s*\))/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The first photo given: an address, or an ImageObject's url or contentUrl, made absolute
// against the page's address. Only http(s) photos are kept.
function imageUrl(value: unknown, pageUrl: string | undefined): string | null {
  for (const item of Array.isArray(value) ? value : [value]) {
    const given = isRecord(item)
      ? [item.url, item.contentUrl].find(
          (url) => typeof url === "string" && url.trim(),
        )
      : item;
    if (typeof given !== "string" || !given.trim()) continue;
    try {
      const url = new URL(given.trim(), pageUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
      // Relative with no page address, or not an address at all.
    }
  }
  return null;
}

function stepsFrom(
  value: unknown,
  section: string | null,
): RecipeDraft["steps"] {
  if (typeof value === "string") {
    return stepsFromMarkdown(
      htmlLines(value.slice(0, LIMITS.instructions)),
    ).map((text) => step(text.slice(0, LIMITS.step), section));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => stepsFrom(item, section));
  }
  if (!isRecord(value)) return [];
  if (types(value).includes("howtosection")) {
    return stepsFrom(value.itemListElement, plain(value.name) || section);
  }
  if (value.itemListElement !== undefined) {
    return stepsFrom(value.itemListElement, section);
  }
  const text =
    plain(capped(value.text, LIMITS.step)) ||
    plain(capped(value.name, LIMITS.step));
  return text ? [step(text, section)] : [];
}

// A block of steps as markdown-ish lines, so an HTML list splits like a typed one.
function htmlLines(text: string): string {
  return decodeEntities(
    text
      .replace(/<li\b[^<>]*>/gi, "\n- ")
      .replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi, "\n")
      .replace(TAG, " "),
  );
}

// A timer when the step names exactly one time ("roast for 20 minutes"); "20 to 25 minutes"
// or two times in one step leave it to the cook.
function step(text: string, section: string | null) {
  const times = [...new Set(minutesIn(text))].filter((minutes) => minutes > 0);
  return {
    text,
    timerMinutes: times.length === 1 ? (times[0] ?? null) : null,
    section,
  };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  frac13: "⅓",
  frac23: "⅔",
  frac18: "⅛",
  deg: "°",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  times: "×",
  eacute: "é",
  egrave: "è",
  ntilde: "ñ",
  ccedil: "ç",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,
    (whole, code: string) => {
      if (code.startsWith("#")) {
        const point =
          code[1]?.toLowerCase() === "x"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return point > 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : whole;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
    },
  );
}
