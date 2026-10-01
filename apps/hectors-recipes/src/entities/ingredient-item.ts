import { splitNote } from "./grocery-merge";
import {
  bracketPackageSize,
  MEASURE_UNITS,
  parseIngredientLine,
  readLeadingQuantity,
  readUnit,
  skipSlashMeasure,
  stripMarkdown,
  type Unit,
} from "./ingredient-line";
import { amountText, unitLabel } from "./scaling";

// One ingredient line, itemized (ux-plan D23): the amount and unit, the name as written, a
// note (prep, serving or a swap: shown on the recipe, left off the grocery list), whether
// it's optional, and the catalog name it's linked to.
export type ItemizedLine = {
  quantity: number | null;
  unit: Unit | null;
  name: string | null;
  note: string | null;
  optional: boolean;
  catalogName: string | null;
};

// The instant, best-effort split, for lines typed or pasted as text. The AI read is the
// careful one; this never throws, and what it can't split stays in the name.
export function itemizeLine(raw: string): ItemizedLine {
  const parsed = parseIngredientLine(raw);
  let line = bracketPackageSize(stripMarkdown(raw)).trim();

  // "(optional)" is a flag, not words to show.
  const optional = /\boptional\b/i.test(line);
  line = line
    .replace(/\s*\(\s*optional\s*\)/i, "")
    .replace(/,\s*optional\b/i, "")
    .trim();

  // A closing "(or …)" is a swap, which the note carries.
  const swap = line.match(/\s*\((or\s[^()]*)\)\s*$/i);
  if (swap) {
    line = line.slice(0, swap.index).trim();
  }

  const { kept, note } = splitNote(line);
  const notes = [note, swap?.[1]?.trim()].filter(Boolean);

  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: nameAsWritten(kept, parsed.unit),
    note: notes.length ? notes.join("; ") : null,
    optional,
    catalogName: parsed.name,
  };
}

// The words left once the amount and unit are off, as written. A package size in a bracket
// ("1 can (14 ounces) crushed tomatoes") moves to the end; a bracket after a measuring unit
// ("2 tablespoons (30 ml) olive oil") is the same amount again, so it goes (it stays in the
// original line), as does one after a slash ("1¾ cups/225 grams flour"). A unit written last
// ("4 garlic cloves") comes off the end.
function nameAsWritten(text: string, unit: Unit | null): string | null {
  let rest = text;
  const leading = readLeadingQuantity(rest);
  if (leading) {
    rest = rest.slice(leading.length).trimStart();
  }

  let bracket = "";
  const takeBracket = () => {
    const match = rest.match(/^\([^()]*\)\s*/);
    if (match && !bracket) {
      bracket = match[0].trim();
      rest = rest.slice(match[0].length);
    }
  };

  takeBracket();
  const read = readUnit(rest);
  if (unit && read.unit === unit) {
    rest = read.rest;
    if (MEASURE_UNITS.has(unit)) {
      rest = skipSlashMeasure(rest).replace(/^\([^()]*\)\s*/, "");
    } else {
      takeBracket();
    }
  } else if (unit) {
    const words = rest.split(" ");
    const last = words.at(-1);
    if (words.length > 1 && last && readUnit(last).unit === unit) {
      rest = words.slice(0, -1).join(" ");
    }
  }

  const name = [rest.replace(/^of\s+/i, "").trim(), bracket]
    .filter(Boolean)
    .join(" ");
  return name || null;
}

// A line written out from its fields, for a row typed or changed in the editor:
// "2 tbsp olive oil", "4 cloves garlic, minced", "¼ cup cashews (optional)".
export function lineText(
  fields: Pick<ItemizedLine, "quantity" | "unit" | "note" | "optional"> & {
    name: string;
  },
): string {
  const amount = [
    fields.quantity === null ? null : amountText(fields.quantity),
    fields.unit ? unitLabel(fields.unit, fields.quantity ?? 1) : null,
  ]
    .filter(Boolean)
    .join(" ");
  const line = [amount, fields.name].filter(Boolean).join(" ");
  return `${line}${fields.note ? `, ${fields.note}` : ""}${fields.optional ? " (optional)" : ""}`;
}
