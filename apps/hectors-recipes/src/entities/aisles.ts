// Grocery aisles (ux-plan D25), in rough store-walk order, as readable stored values. Set
// on a catalog ingredient; grocery items get theirs through the ingredient they point to.
export const AISLES = [
  "produce",
  "meat-and-seafood",
  "dairy-and-eggs",
  "bakery",
  "pantry",
  "canned-and-jarred",
  "baking",
  "spices-and-seasonings",
  "condiments-and-sauces",
  "frozen",
  "drinks",
] as const;
export type Aisle = (typeof AISLES)[number];

const AISLE_LABELS: Record<Aisle, string> = {
  produce: "Produce",
  "meat-and-seafood": "Meat & seafood",
  "dairy-and-eggs": "Dairy & eggs",
  bakery: "Bakery",
  pantry: "Pantry",
  "canned-and-jarred": "Canned & jarred",
  baking: "Baking",
  "spices-and-seasonings": "Spices & seasonings",
  "condiments-and-sauces": "Condiments & sauces",
  frozen: "Frozen",
  drinks: "Drinks",
};

// Items in store-walk order by aisle, keeping each aisle's items in their own order; items
// with no aisle (typed in, or a shopping name without one yet) come last, as "Other".
export function groupByAisle<T extends { aisle: Aisle | null }>(
  items: T[],
): { aisle: Aisle | null; label: string; items: T[] }[] {
  return [...AISLES, null].flatMap((aisle) => {
    const inAisle = items.filter((item) => item.aisle === aisle);
    return inAisle.length
      ? [
          {
            aisle,
            label: aisle ? AISLE_LABELS[aisle] : "Other",
            items: inAisle,
          },
        ]
      : [];
  });
}

// Items of one catalog ingredient moved up to sit under the first of them (ux-plan D61), so
// "2 cloves garlic" and "1 tbsp garlic" are bought together. Everything else keeps its order,
// and items with no ingredient (typed in) stay where they are.
export function stackLikeItems<T extends { ingredientId: string | null }>(
  items: T[],
): T[] {
  const stacks = new Map<string, T[]>();
  const order: T[][] = [];
  for (const item of items) {
    const stack = item.ingredientId ? stacks.get(item.ingredientId) : undefined;
    if (stack) {
      stack.push(item);
      continue;
    }
    const fresh = [item];
    if (item.ingredientId) stacks.set(item.ingredientId, fresh);
    order.push(fresh);
  }
  return order.flat();
}
