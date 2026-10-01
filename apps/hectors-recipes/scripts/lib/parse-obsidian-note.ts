import { stripMarkdown } from "@/src/entities/ingredient-line";
import { linesFromText, type TextLine } from "@/src/entities/ingredient-text";

export type ObsidianRecipe = {
  title: string;
  tags: string[];
  sourceUrl: string | null;
  imageUrl: string | null;
  timeMinutes: number | null;
  yieldServings: number | null;
  instructions: string;
  ingredients: TextLine[];
  externalRef: string;
};

export type ParsedNote =
  | { ok: true; recipe: ObsidianRecipe }
  | { ok: false; title: string; reason: string };

type Frontmatter = Record<string, string | string[]>;

const INGREDIENTS_HEADING = /ingredients/i;
const INSTRUCTIONS_HEADING = /instructions|preparation|directions|method/i;
// Clipped NYT pages end with readers' comments (with their names); not part of the recipe.
const EXCLUDED_HEADING = /cooking notes/i;
// Tags that carry no meaning in the app's tag filter.
const DROPPED_TAGS = new Set(["other"]);

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match?.[1]) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!pair?.[1]) continue;
    const value = (pair[2] ?? "").trim();
    if (value.startsWith("[")) {
      frontmatter[pair[1]] = [...value.matchAll(/"([^"]*)"|'([^']*)'/g)].map(
        (item) => (item[1] ?? item[2] ?? "").trim(),
      );
    } else {
      frontmatter[pair[1]] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { frontmatter, body: content.slice(match[0].length) };
}

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function asList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function httpUrl(value: string | undefined): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

export function parseMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (!hours && !minutes) {
    const bare = Number(value.trim());
    return Number.isInteger(bare) && bare > 0 ? bare : null;
  }
  const total =
    Math.round(Number(hours?.[1] ?? 0) * 60) + Number(minutes?.[1] ?? 0);
  return total > 0 ? total : null;
}

function findServings(frontmatter: Frontmatter, body: string): number | null {
  const fromFrontmatter = Number(asString(frontmatter.servings));
  if (Number.isInteger(fromFrontmatter) && fromFrontmatter > 0) {
    return fromFrontmatter;
  }
  const text = stripMarkdown(body);
  const match =
    text.match(/\bserves\s+(\d+)/i) ??
    text.match(
      /\b(?:makes|yield:?)\s*(\d+)(?:\s*(?:to|-|–)\s*\d+)?\s*(?:serving|people|portion)/i,
    );
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

type Section = { heading: string; lines: string[] };

function splitSections(body: string): { title?: string; sections: Section[] } {
  let title: string | undefined;
  const sections: Section[] = [{ heading: "", lines: [] }];

  for (const line of body.split("\n")) {
    // The first H1 is the title; any later H1 or H2 starts a section. H3s stay inside it.
    const heading = line.match(/^(#{1,2})\s+(.+)$/);
    if (heading?.[2]) {
      if (!title && heading[1] === "#") {
        title = stripMarkdown(heading[2]);
      } else {
        sections.push({ heading: heading[2], lines: [] });
      }
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }

  return { title, sections };
}

// Drops what isn't an ingredient: separators, image embeds, and yield/servings notes.
function isIngredientNoise(line: string): boolean {
  const plain = stripMarkdown(
    line.replace(/^\s*(?:[-*+]\s+)?(?:\[[ xX]\]\s*)?/, ""),
  )
    .replace(/^🍴\s*/, "")
    .replace(/^\*+/, "");
  return (
    !plain ||
    /^-{3,}$/.test(plain) ||
    plain.startsWith("![[") ||
    /^(?:makes|yield|serves)\b/i.test(plain)
  );
}

function cleanInstructions(lines: string[]): string {
  return lines
    .filter((line) => !/^\s*!\[\[.*\]\]\s*$/.test(line))
    .map((line) =>
      line.replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (_, target, alias) => alias ?? target,
      ),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseObsidianNote(
  fileName: string,
  content: string,
): ParsedNote {
  const { frontmatter, body } = parseFrontmatter(content);
  const { title: heading, sections } = splitSections(body);
  const title = heading || fileName.replace(/\.md$/, "");

  const ingredientsIndex = sections.findIndex((section) =>
    INGREDIENTS_HEADING.test(stripMarkdown(section.heading)),
  );
  if (ingredientsIndex === -1) {
    return { ok: false, title, reason: "no ingredients section" };
  }

  const ingredientLines = (sections[ingredientsIndex]?.lines ?? [])
    .filter((line) => !isIngredientNoise(line))
    .map((line) => {
      const subheading = line.match(/^###\s+(.+)$/)?.[1];
      return subheading
        ? `${stripMarkdown(subheading).replace(/:$/, "")}:`
        : line;
    });
  const ingredients = linesFromText(ingredientLines.join("\n"));
  if (!ingredients.length) {
    return { ok: false, title, reason: "ingredients section is empty" };
  }

  // Everything from the instructions heading on (variants, cooking notes) is kept as markdown.
  const instructionsIndex = sections.findIndex(
    (section, index) =>
      index > ingredientsIndex &&
      INSTRUCTIONS_HEADING.test(stripMarkdown(section.heading)),
  );
  const instructionLines =
    instructionsIndex === -1
      ? []
      : sections
          .slice(instructionsIndex)
          .filter((section) => !EXCLUDED_HEADING.test(section.heading))
          .flatMap((section, index) =>
            index === 0
              ? section.lines
              : [`## ${stripMarkdown(section.heading)}`, ...section.lines],
          );

  const tags = [...asList(frontmatter.meal), ...asList(frontmatter.recipe_tags)]
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag && !DROPPED_TAGS.has(tag));

  return {
    ok: true,
    recipe: {
      title,
      tags: [...new Set(tags)],
      sourceUrl: httpUrl(asString(frontmatter.source)),
      imageUrl: httpUrl(asString(frontmatter.cover)),
      timeMinutes: parseMinutes(asString(frontmatter.time)),
      yieldServings: findServings(frontmatter, body),
      instructions: cleanInstructions(instructionLines),
      ingredients,
      externalRef: `obsidian:${fileName}`,
    },
  };
}
