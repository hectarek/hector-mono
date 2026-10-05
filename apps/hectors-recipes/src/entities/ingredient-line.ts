export const UNITS = [
  "tsp",
  "tbsp",
  "cup",
  "pint",
  "fl-oz",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "l",
  "pinch",
  "dash",
  "clove",
  "sprig",
  "stalk",
  "can",
  "bunch",
  "slice",
  "stick",
  "head",
  "package",
] as const;
export type Unit = (typeof UNITS)[number];

// Units that measure an amount. A bracket after one of these is the same amount in
// another unit ("110 g (⅓ cup)"): it scales, and isn't part of the name. After a package
// unit ("1 can (14 oz)") it's the package size, which doesn't scale and stays with the name.
export const MEASURE_UNITS: ReadonlySet<Unit> = new Set<Unit>([
  "tsp",
  "tbsp",
  "cup",
  "pint",
  "fl-oz",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "l",
]);

export type ParsedIngredientLine = {
  quantity: number | null;
  unit: Unit | null;
  name: string | null;
};

const UNIT_ALIASES: Record<string, Unit> = {
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tbs: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  c: "cup",
  pint: "pint",
  pints: "pint",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  pinch: "pinch",
  pinches: "pinch",
  dash: "dash",
  dashes: "dash",
  clove: "clove",
  cloves: "clove",
  sprig: "sprig",
  sprigs: "sprig",
  stalk: "stalk",
  stalks: "stalk",
  // Celery's ribs are its stalks (LEADING_ONLY_UNIT_WORDS).
  rib: "stalk",
  ribs: "stalk",
  can: "can",
  cans: "can",
  tin: "can",
  tins: "can",
  bunch: "bunch",
  bunches: "bunch",
  slice: "slice",
  slices: "slice",
  stick: "stick",
  sticks: "stick",
  head: "head",
  heads: "head",
  package: "package",
  packages: "package",
  pkg: "package",
};

// Spelled-out unit words and their plurals, which follow the amount ("1 cup", "2 cups").
// Abbreviations (tbsp, g, oz) read the same either way and aren't listed.
export const UNIT_WORD_FORMS: [singular: string, plural: string][] = [
  ["cup", "cups"],
  ["pint", "pints"],
  ["teaspoon", "teaspoons"],
  ["tablespoon", "tablespoons"],
  ["ounce", "ounces"],
  ["pound", "pounds"],
  ["gram", "grams"],
  ["pinch", "pinches"],
  ["dash", "dashes"],
  ["clove", "cloves"],
  ["sprig", "sprigs"],
  ["stalk", "stalks"],
  ["can", "cans"],
  ["bunch", "bunches"],
  ["slice", "slices"],
  ["stick", "sticks"],
  ["head", "heads"],
  ["package", "packages"],
];

// Case matters for the one-letter cookbook abbreviations: T = tablespoon, t = teaspoon.
const CASE_SENSITIVE_UNITS: Record<string, Unit> = { T: "tbsp", t: "tsp" };

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");
// One amount: "1 1/2", "1-1/2", "1 ½", "1½", "1/2", "½", "1.5", "2". "2-2/3" is two and
// two-thirds (Taste of Home writes them so), not a range down to ⅔.
export const AMOUNT = `(?:\\d+(?:\\.\\d+)?\\s*[${FRACTION_CHARS}]|\\d+-\\d+/\\d+(?![\\d/])|\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|[${FRACTION_CHARS}])`;
const LEADING_QUANTITY = new RegExp(
  `^~?\\s*(${AMOUNT})(?:\\s*(?:-|–|to)\\s*(${AMOUNT}))?`,
);

const SIZE_WORDS = new Set(["small", "medium", "large", "extra-large"]);
const IRREGULAR_SINGULARS: Record<string, string> = {
  leaves: "leaf",
  halves: "half",
  loaves: "loaf",
};
// Count units that also get written after the name ("2 garlic cloves" = "2 cloves garlic").
const TRAILING_COUNT_UNITS = new Set<Unit>([
  "clove",
  "sprig",
  "stalk",
  "stick",
  "head",
  "bunch",
  "slice",
]);
// Unit words read only before the name: after it, ribs are meat ("4 beef short ribs").
const LEADING_ONLY_UNIT_WORDS = new Set(["rib", "ribs"]);
const SINGULAR_EXCEPTIONS = new Set([
  "asparagus",
  "couscous",
  "hummus",
  "molasses",
  "swiss",
  "brussels",
  "grits",
  "oats",
  "greens",
]);

export function stripMarkdown(text: string): string {
  return (
    text
      // A link's text; the brackets' insides can't hold more brackets, so it stays linear.
      .replace(/\[([^[\]]*)\]\([^()]*\)/g, "$1")
      .replace(/\*\*|__/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function amountToNumber(amount: string): number | null {
  const text = amount.trim();
  const unicode = text.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?)?\\s*([${FRACTION_CHARS}])$`),
  );
  if (unicode?.[2]) {
    return (
      (unicode[1] ? Number(unicode[1]) : 0) +
      (UNICODE_FRACTIONS[unicode[2]] ?? 0)
    );
  }

  const mixed = text.match(/^(\d+)(?:\s+|-)(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

// A can's or package's size written before it, unbracketed: "1 15-oz. can chickpeas", "2 15
// ounce cans beans", or with no count, "28-ounce can tomatoes" (one can). Rewritten as the
// bracketed form the parse already reads: "1 (15-oz.) can chickpeas".
const UNBRACKETED_PACKAGE_SIZE =
  /^(?:(\d+)\s+)?(\d+(?:\.\d+)?\s*-?\s*(?:oz|ounces?)\.?)\s+(?=(?:cans?|packages?)\b)/i;

export function bracketPackageSize(text: string): string {
  return text.replace(
    UNBRACKETED_PACKAGE_SIZE,
    (_, count: string | undefined, size: string) =>
      `${count ?? "1"} (${size}) `,
  );
}

// The alternate measure some sources write after a slash: "1½cups/302 grams sugar".
export function skipSlashMeasure(text: string): string {
  return text.replace(/^\/\s*[\d.,]+\s*[A-Za-z]+\.?\s*/, "");
}

function skipParenthetical(text: string): string {
  if (!text.startsWith("(")) {
    return text;
  }
  const close = text.indexOf(")");
  return close === -1 ? text : text.slice(close + 1).trimStart();
}

// Every amount written in the text, each end of a range on its own: "2-3 cups (16 oz)" gives 2, 3, 16.
export function amountsIn(text: string): number[] {
  return [...text.matchAll(new RegExp(AMOUNT, "g"))].flatMap((match) => {
    const amount = amountToNumber(match[0]);
    return amount === null ? [] : [amount];
  });
}

// Whether the text names this unit anywhere: "4 garlic cloves" names clove, "1 can
// (14 ounces)" names both can and oz, and "150g" and "1½cups/302 grams" name g and cup.
export function mentionsUnit(text: string, unit: Unit): boolean {
  const spaced = text
    .replace(/[()/]/g, " ")
    .replace(new RegExp(`([\\d${FRACTION_CHARS}])(?=[A-Za-z])`, "g"), "$1 ");
  return [...spaced.matchAll(/(?:^|\s)(?=[A-Za-z])/g)].some(
    (match) =>
      readUnit(spaced.slice(match.index + match[0].length)).unit === unit,
  );
}

export function readUnit(text: string): { unit: Unit | null; rest: string } {
  const fluidOunce = text.match(/^(?:fl\.?\s*oz\.?|fluid\s+ounces?)\b/i);
  if (fluidOunce) {
    return {
      unit: "fl-oz",
      rest: text.slice(fluidOunce[0].length).trimStart(),
    };
  }

  const token = text.match(/^([A-Za-z]+)\.?(?=\s|,|$|\(|\/)/);
  if (!token?.[1]) {
    return { unit: null, rest: text };
  }

  const word = token[1];
  const unit = CASE_SENSITIVE_UNITS[word] ?? UNIT_ALIASES[word.toLowerCase()];
  if (!unit) {
    return { unit: null, rest: text };
  }
  return { unit, rest: text.slice(token[0].length).trimStart() };
}

export function singularize(word: string): string {
  const irregular = IRREGULAR_SINGULARS[word];
  if (irregular) {
    return irregular;
  }
  if (SINGULAR_EXCEPTIONS.has(word) || word.length <= 3) {
    return word;
  }
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

// A shopping name in the catalog's form: "Crushed Tomatoes" is "crushed tomato". Unlike a
// line's name, unit words stay: "ground cloves" is "ground clove", not "ground".
export function toCatalogName(name: string): string | null {
  return toName(stripMarkdown(name));
}

function toName(text: string): string | null {
  const cut = text
    .split(
      /,| - | – | \(|\(|\s+to taste\b|\s+for (?:garnish|serving|frying)\b/i,
    )[0]
    ?.replace(/\*+$/, "")
    .replace(/^of\s+/i, "")
    .trim()
    .toLowerCase();

  if (!cut) {
    return null;
  }

  const words = cut.split(" ").filter((word) => !SIZE_WORDS.has(word));
  const last = words.pop();
  if (!last) {
    return null;
  }
  return [...words, singularize(last)].join(" ");
}

// The quantity at the start of a line ("1 1/2", "½", "2-3" → upper value) and how many characters it spans.
export function readLeadingQuantity(
  text: string,
): { quantity: number; length: number } | null {
  const match = text.match(LEADING_QUANTITY);
  if (!match?.[1]) {
    return null;
  }

  const low = amountToNumber(match[1]);
  const high = match[2] ? amountToNumber(match[2]) : null;
  // "2-2/3 cups" is two and two-thirds (Taste of Home writes them so), not a range down to ⅔.
  const quantity =
    low !== null && high !== null && Number.isInteger(low) && high < 1
      ? low + high
      : (high ?? low);
  return quantity !== null && quantity > 0
    ? { quantity, length: match[0].length }
    : null;
}

// Best-effort parse of one ingredient line. Never throws; anything not understood is null.
export function parseIngredientLine(raw: string): ParsedIngredientLine {
  let text = bracketPackageSize(stripMarkdown(raw));
  const leading = readLeadingQuantity(text);
  const quantity = leading?.quantity ?? null;
  if (leading) {
    text = text.slice(leading.length).trimStart();
  }

  text = skipParenthetical(text);
  const { unit, rest } = readUnit(text);
  text = skipParenthetical(skipSlashMeasure(rest));
  // "1 whole onion" is one onion; with a unit, "whole" is what you buy ("1 cup whole milk").
  if (quantity !== null && !unit) {
    text = text.replace(/^whole\s+/i, "");
  }

  let name = toName(text);
  let lineUnit = unit;

  if (!lineUnit && name) {
    const words = name.split(" ");
    const last = words.at(-1) ?? "";
    const trailing = LEADING_ONLY_UNIT_WORDS.has(last)
      ? undefined
      : UNIT_ALIASES[last];
    if (trailing && TRAILING_COUNT_UNITS.has(trailing) && words.length > 1) {
      lineUnit = trailing;
      name = words.slice(0, -1).join(" ");
    }
  }

  return { quantity, unit: lineUnit, name };
}
