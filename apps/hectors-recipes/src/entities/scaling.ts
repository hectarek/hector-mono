import {
  MEASURE_UNITS,
  readLeadingQuantity,
  readUnit,
  stripMarkdown,
  UNIT_WORD_FORMS,
  UNITS,
  type Unit,
} from "./ingredient-line";
import type { RecipeIngredient } from "./models/recipe-ingredient.model";

const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
];

// Kitchen-friendly display: snaps to the nearest common fraction (1.49 → "1½").
// Quantities are estimates, so precision past an eighth isn't meaningful.
export function formatQuantity(value: number): string {
  if (value >= 10) {
    return String(Math.round(value));
  }

  const whole = Math.floor(value);
  const remainder = value - whole;
  const [fraction, symbol] = FRACTIONS.reduce((best, candidate) =>
    Math.abs(remainder - candidate[0]) < Math.abs(remainder - best[0])
      ? candidate
      : best,
  );
  const wholePart = fraction === 1 ? whole + 1 : whole;

  if (!wholePart && !symbol) {
    return "⅛";
  }
  return `${wholePart || ""}${symbol}`;
}

// A typed amount ("2", "1 1/2", "1½", "½") as a number; null when the text isn't one.
export function readAmount(text: string): number | null {
  const trimmed = text.trim();
  const read = readLeadingQuantity(trimmed);
  return read && read.length === trimmed.length ? read.quantity : null;
}

// An amount as it should appear in a field: the friendly fraction when that is the same
// number, else the decimal, so showing and saving never changes it (1.6 isn't 1⅝).
export function amountText(value: number): string {
  const friendly = formatQuantity(value);
  const back = readAmount(friendly);
  return back !== null && Math.abs(back - value) < 1e-9
    ? friendly
    : String(value);
}

// Keeps a spelled-out unit word in step with the new amount ("1 cup" → "2 cups").
function matchUnitWordNumber(rest: string, quantity: number): string {
  const match = rest.match(/^(\s*)([A-Za-z]+)\b/);
  if (!match?.[2]) {
    return rest;
  }
  const word = match[2];
  const lower = word.toLowerCase();
  const forms = UNIT_WORD_FORMS.find(
    ([singular, plural]) => lower === singular || lower === plural,
  );
  if (!forms) {
    return rest;
  }
  const wanted = quantity > 1 ? forms[1] : forms[0];
  const cased =
    word[0] === word[0]?.toUpperCase()
      ? wanted[0]?.toUpperCase() + wanted.slice(1)
      : wanted;
  return `${match[1]}${cased}${rest.slice(match[0].length)}`;
}

// Rewrites the leading quantity of a raw line for a new serving count and keeps the rest verbatim.
export function scaleLine(raw: string, factor: number): string {
  if (factor === 1) {
    return raw;
  }

  const text = raw.trimStart();
  const leading = readLeadingQuantity(text);
  if (!leading) {
    return raw;
  }

  let rest = text.slice(leading.length);
  const { unit, rest: afterUnit } = readUnit(rest.trimStart());
  if (unit && MEASURE_UNITS.has(unit) && afterUnit.startsWith("(")) {
    const inner = readLeadingQuantity(afterUnit.slice(1));
    if (inner) {
      const prefix = rest.slice(0, rest.length - afterUnit.length);
      rest = `${prefix}(${formatQuantity(inner.quantity * factor)}${afterUnit.slice(1 + inner.length)}`;
    }
  }
  const scaled = leading.quantity * factor;
  return `${formatQuantity(scaled)}${matchUnitWordNumber(rest, scaled)}`;
}

// A recipe line as it's shown, at a serving count: its amount, unit and name, then its note
// and whether it's optional (ux-plan D23). A line with no name yet (never itemized) falls
// back to its original text, scaled.
export type ShownLine = {
  text: string;
  note: string | null;
  optional: boolean;
};

export function showLine(
  line: Pick<
    RecipeIngredient,
    "raw" | "quantity" | "unit" | "name" | "note" | "optional"
  >,
  factor: number,
): ShownLine {
  if (!line.name) {
    return {
      text: stripMarkdown(scaleLine(line.raw, factor)),
      note: null,
      optional: false,
    };
  }
  const quantity = line.quantity === null ? null : line.quantity * factor;
  const unit = UNITS.find((candidate) => candidate === line.unit);
  const text = [
    quantity === null ? null : formatQuantity(quantity),
    unit ? unitLabel(unit, quantity ?? 1) : null,
    line.name,
  ]
    .filter(Boolean)
    .join(" ");
  return { text, note: line.note, optional: line.optional };
}

// "cup" for one, "cups" for more (the same words scaling rewrites).
export function unitLabel(unit: Unit, quantity: number): string {
  if (unit === "fl-oz") return "fl oz";
  const forms = UNIT_WORD_FORMS.find(([singular]) => singular === unit);
  return forms ? forms[quantity > 1 ? 1 : 0] : unit;
}
