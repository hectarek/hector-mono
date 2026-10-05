import { singularize, type Unit } from "./ingredient-line";
import { formatQuantity, unitLabel } from "./scaling";

export type GroceryLineCandidate = {
  quantity: number | null;
  unit: Unit | null;
  ingredientId: string | null;
};

export type ExistingGroceryItem = {
  id: string;
  checked: boolean;
  quantity: number | null;
  unit: string | null;
  ingredientId: string | null;
};

export type GroceryAddPlan =
  | { kind: "insert" }
  | { kind: "merge"; itemId: string; quantity: number }
  | { kind: "skip"; itemId: string };

// Merge only when it's clearly the same thing: same ingredient, same unit, both with
// amounts, and still on the to-buy list. Anything else gets its own line, except an
// amount-less line ("Salt, to taste") for something already on the list, which is skipped.
export function planGroceryAdd(
  line: GroceryLineCandidate,
  existing: ExistingGroceryItem[],
): GroceryAddPlan {
  if (!line.ingredientId) {
    return { kind: "insert" };
  }

  if (line.quantity === null) {
    const already = existing.find(
      (item) => !item.checked && item.ingredientId === line.ingredientId,
    );
    return already ? { kind: "skip", itemId: already.id } : { kind: "insert" };
  }

  const match = existing.find(
    (item) =>
      !item.checked &&
      item.ingredientId === line.ingredientId &&
      item.unit === line.unit &&
      item.quantity !== null,
  );

  if (!match || match.quantity === null) {
    return { kind: "insert" };
  }
  return {
    kind: "merge",
    itemId: match.id,
    quantity: match.quantity + line.quantity,
  };
}

const IRREGULAR_PLURALS: Record<string, string> = {
  potato: "potatoes",
  tomato: "tomatoes",
  leaf: "leaves",
};

function pluralizeName(name: string): string {
  const words = name.split(" ");
  const last = words.pop() ?? "";
  const plural =
    IRREGULAR_PLURALS[last] ??
    (/[^aeiou]y$/.test(last)
      ? `${last.slice(0, -1)}ies`
      : /(s|x|ch|sh)$/.test(last)
        ? `${last}es`
        : `${last}s`);
  return [...words, plural].join(" ");
}

// A recipe line's name with its last word made singular ("large eggs" is "large egg"), so
// a count can make it plural again. A name with brackets ("crushed tomatoes (28-ounce)")
// is left as written: its last word isn't the thing being counted.
export function singularName(name: string): string {
  if (name.includes("(")) return name;
  const words = name.split(" ");
  const last = words.pop() ?? "";
  return [...words, singularize(last.toLowerCase())].join(" ");
}

// Text for a grocery line from its amount, e.g. "3 cloves garlic", "1½ cups flour",
// "3 onions".
export function formatGroceryText(item: {
  quantity: number;
  unit: Unit | null;
  name: string;
}): string {
  const amount = formatQuantity(item.quantity);
  const many = item.quantity > 1;

  if (!item.unit) {
    const plural = many && !item.name.includes("(");
    return `${amount} ${plural ? pluralizeName(item.name) : item.name}`;
  }

  return `${amount} ${unitLabel(item.unit, item.quantity)} ${item.name}`;
}

// Words that start a note on preparing or serving after a comma ("1 onion, diced",
// "Salt, to taste"), taken from the vault's lines. Only these cut a line: a comma before
// anything else can be part of what you buy ("chicken thighs, boneless and skinless").
const NOTE_WORDS = new Set([
  "at",
  "beaten",
  "chilled",
  "chopped",
  "coarsely",
  "cooled",
  "cored",
  "crumbled",
  "crushed",
  "cubed",
  "cut",
  "deveined",
  "diced",
  "divided",
  "drained",
  "finely",
  "for",
  "grated",
  "halved",
  "if",
  "julienned",
  "juiced",
  "lightly",
  "mashed",
  "melted",
  "minced",
  "optional",
  "packed",
  "patted",
  "peeled",
  "pitted",
  "preferably",
  "quartered",
  "rinsed",
  "roughly",
  "seeded",
  "shredded",
  "sifted",
  "sliced",
  "softened",
  "soaked",
  "squeezed",
  "steamed",
  "thawed",
  "thinly",
  "to",
  "toasted",
  "torn",
  "tough",
  "trimmed",
  "use",
  "zested",
]);

// The first comma outside brackets: "(or 1 can, drained)" is one alternative, not a note.
function topLevelComma(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) return index;
  }
  return -1;
}

// A recipe line split into what you buy (the recipe's own words, so "black beans" stays
// plural and "(14 oz)" stays put) and the note on preparing or serving it ("diced", "to
// taste"). The kept part is the grocery-list text; the note is an itemized line's note.
// Spaces and , . ; : off the end, by hand: as a regex anchored at the end, a long run of them
// mid-line is rescanned from every position (P14 review).
function trimPunctuationEnd(text: string): string {
  let end = text.length;
  while (end > 0 && " \t\n,.;:".includes(text.charAt(end - 1))) end--;
  return text.slice(0, end).trim();
}

export function splitNote(line: string): { kept: string; note: string | null } {
  const serving = line.search(
    /\s+(?:to taste|for (?:garnish|serving|frying|decorating))\b/i,
  );
  const comma = topLevelComma(line);
  const [next, after] = line
    .slice(comma + 1)
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .split(/\s+/);
  // "plus more for dusting" is a note; "plus 1½ teaspoons gelatin" is more to buy.
  const isNote =
    next === "plus" ? after === "more" : !!next && NOTE_WORDS.has(next);
  const cuts = [serving, comma !== -1 && isNote ? comma : -1].filter(
    (index) => index !== -1,
  );

  let text = line;
  let note: string | null = null;
  if (cuts.length) {
    const cut = Math.min(...cuts);
    const tail = line.slice(cut);
    // "cheddar, shredded (8 oz)": the note goes, but not the amount you're buying.
    const kept = tail.match(/\((?:optional|\d)[^()]*\)/gi) ?? [];
    text = [line.slice(0, cut), ...kept].join(" ");
    note =
      trimPunctuationEnd(
        kept
          .reduce((rest, bracket) => rest.replace(bracket, ""), tail)
          .replace(/^[\s,]+/, ""),
      ) || null;
  }
  const cleaned = trimPunctuationEnd(
    text
      // "8 chicken thighs - (skinless)": the bracket stays, the dash before it goes.
      .replace(/\s+[-–]\s+(?=\()/g, " ")
      // What's left of "salt, or to taste".
      .replace(/,?\s+or$/i, ""),
  );
  return { kept: cleaned || line, note };
}

// A recipe line as grocery-list text: what you buy, without the note (see splitNote). Text
// only: the parsed amount the list merges by is unchanged.
export function groceryText(line: string): string {
  return splitNote(line).kept;
}

// A recipe an item is for, and its share of the item's amount (ux-plan D59): null when its
// line had no amount ("Salt, to taste").
export type ItemRecipe = {
  recipeId: string;
  title: string;
  quantity: number | null;
};

export type GroceryLine = GroceryLineCandidate & {
  text: string;
  name: string | null;
  // The recipe it's from: the item links to it, and shows its title as "for …".
  recipeId: string;
  title: string;
};

export type GroceryListItem = ExistingGroceryItem & {
  text: string;
  recipes: ItemRecipe[];
};

// What an item says it's "for": its recipes' titles in the order they were added, or null
// for one typed in.
export function recipeTitles(
  item: Pick<GroceryListItem, "recipes">,
): string | null {
  return item.recipes.length
    ? item.recipes.map((recipe) => recipe.title).join(", ")
    : null;
}

export type NewGroceryItem = Omit<GroceryListItem, "id" | "checked">;

export type GroceryChanges = {
  inserts: NewGroceryItem[];
  updates: Pick<GroceryListItem, "id" | "text" | "quantity" | "recipes">[];
  skipped: number;
};

// Links an item to a line's recipe, adding the line's amount to that recipe's share.
function withRecipe(recipes: ItemRecipe[], line: GroceryLine): ItemRecipe[] {
  const share = recipes.find((recipe) => recipe.recipeId === line.recipeId);
  if (!share) {
    return [
      ...recipes,
      { recipeId: line.recipeId, title: line.title, quantity: line.quantity },
    ];
  }
  if (line.quantity === null) {
    return recipes;
  }
  const quantity = (share.quantity ?? 0) + line.quantity;
  return recipes.map((recipe) =>
    recipe === share ? { ...recipe, quantity } : recipe,
  );
}

// Plans adding many recipe lines at once: lines merge into what's already on the list
// and into each other (garlic from three recipes becomes one line, linked to all three).
export function planGroceryBatch(
  lines: GroceryLine[],
  existing: GroceryListItem[],
): GroceryChanges {
  const working: GroceryListItem[] = existing.map((item) => ({ ...item }));
  const inserts: GroceryListItem[] = [];
  const updated = new Map<string, GroceryListItem>();
  const existingIds = new Set(existing.map((item) => item.id));
  let skipped = 0;

  for (const line of lines) {
    const plan = planGroceryAdd(line, working);
    const target =
      plan.kind === "insert"
        ? undefined
        : working.find((item) => item.id === plan.itemId);

    if (plan.kind === "skip" && target) {
      target.recipes = withRecipe(target.recipes, line);
      skipped++;
    } else if (plan.kind === "merge" && target && line.name) {
      target.quantity = plan.quantity;
      target.text = formatGroceryText({
        quantity: plan.quantity,
        unit: line.unit,
        name: line.name,
      });
      target.recipes = withRecipe(target.recipes, line);
    } else {
      const item: GroceryListItem = {
        id: `new:${inserts.length}`,
        checked: false,
        text: line.text,
        quantity: line.quantity,
        unit: line.unit,
        ingredientId: line.ingredientId,
        recipes: withRecipe([], line),
      };
      working.push(item);
      inserts.push(item);
      continue;
    }

    if (target && existingIds.has(target.id)) {
      updated.set(target.id, target);
    }
  }

  return {
    inserts: inserts.map(({ text, quantity, unit, ingredientId, recipes }) => ({
      text,
      quantity,
      unit,
      ingredientId,
      recipes,
    })),
    updates: [...updated.values()].map(({ id, text, quantity, recipes }) => ({
      id,
      text,
      quantity,
      recipes,
    })),
    skipped,
  };
}
