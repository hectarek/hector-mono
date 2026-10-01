import { stripMarkdown } from "./ingredient-line";

// Obsidian checkbox/bullet prefixes, so a pasted vault list works as-is.
const LIST_PREFIX = /^(?:[-*+]\s+)?(?:\[[ xX]\]\s*)?/;

// One ingredient line of pasted text, and the section it's under.
export type TextLine = { raw: string; section?: string };

// A line ending in ":" ("Cream Cheese Frosting:") starts a section for the lines after it.
export function linesFromText(text: string): TextLine[] {
  const lines: TextLine[] = [];
  let section: string | undefined;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim().replace(LIST_PREFIX, "").trim();
    if (!line) {
      continue;
    }

    const plain = stripMarkdown(line);
    if (plain.endsWith(":")) {
      section = plain.slice(0, -1).trim() || undefined;
      continue;
    }

    lines.push(section ? { raw: line, section } : { raw: line });
  }

  return lines;
}
