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

export const AISLE_LABELS: Record<Aisle, string> = {
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
