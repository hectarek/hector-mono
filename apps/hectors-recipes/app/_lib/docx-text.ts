import { strFromU8, unzipSync } from "fflate";

const DOCUMENT = "word/document.xml";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, name: string) => {
      if (name.startsWith("#x") || name.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
      }
      if (name.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
      }
      return ENTITIES[name] ?? entity;
    },
  );
}

// A Word document's text (docs/ux-plan.md D74), read on the phone and then sent as a text
// file is: a .docx is a zip whose word/document.xml holds the body, one <w:p> per paragraph,
// its words in <w:t>. Tabs and line breaks are kept; numbering, tables' borders and styles are
// not, which the reader doesn't need. Null for anything that isn't one.
export function docxText(bytes: Uint8Array): string | null {
  let xml: string;
  try {
    const files = unzipSync(bytes, {
      filter: (file) => file.name === DOCUMENT,
    });
    const body = files[DOCUMENT];
    if (!body) return null;
    xml = strFromU8(body);
  } catch {
    return null;
  }

  const paragraphs = xml.split(/<\/w:p>/).map((paragraph) =>
    decode(
      paragraph
        .replace(/<w:tab\/>/g, "<w:t>\t</w:t>")
        .replace(/<w:(?:br|cr)\/>/g, "<w:t>\n</w:t>")
        .match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g)
        ?.map((run) => run.replace(/<[^>]+>/g, ""))
        .join("") ?? "",
    ),
  );
  return paragraphs
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
