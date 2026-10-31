import { z } from "zod";

// What a tag says about a recipe (docs/ux-plan.md D55): its meal, its cuisine, or a diet it
// suits. Readable values, as aisles are. A tag with none of these has no group.
export const TAG_CATEGORIES = ["meal", "cuisine", "diet"] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];

export function isTagCategory(value: unknown): value is TagCategory {
  return TAG_CATEGORIES.some((category) => category === value);
}

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  meal: "Meal",
  cuisine: "Cuisine",
  diet: "Diet",
};

// Each grouped tag's group, by its name as recipes store it.
export type TagGroups = Record<string, TagCategory>;

// New tags' groups, as the recipe form sends them with the recipe (D55).
export const tagGroupsSchema = z.record(z.string(), z.enum(TAG_CATEGORIES));

// The groups given for these tags, leaving out any other.
export function groupsFor(tags: string[], groups: TagGroups): TagGroups {
  return Object.fromEntries(
    tags.flatMap((tag) => {
      const group = groups[tag];
      return group ? [[tag, group]] : [];
    }),
  );
}

// What recipe pages call a meal or a diet (schema.org's recipeCategory and keywords), in the
// starting tags' words.
const TAG_WORDS: Record<string, string> = {
  "main course": "dinner",
  "main dish": "dinner",
  entree: "dinner",
  entrée: "dinner",
  side: "side dish",
  sides: "side dish",
  appetizer: "snack",
  snacks: "snack",
  desserts: "dessert",
  beverage: "drink",
  drinks: "drink",
  "gluten free": "gluten-free",
  "dairy free": "dairy-free",
  "high protein": "high-protein",
};

// Tags suggested for a recipe as it's read (docs/ux-plan.md D97), held to the ones the form
// offers: each tidied as a saved tag is, put in the starting tags' words when it isn't offered
// as written, and kept only when offered, once. A read never adds a tag of its own.
export function offeredOnly(suggested: string[], offered: string[]): string[] {
  const kept = suggested
    .map((tag) => tag.trim().replace(/\s+/g, " ").toLowerCase())
    .map((tag) => (offered.includes(tag) ? tag : TAG_WORDS[tag]))
    .filter((tag): tag is string => tag !== undefined && offered.includes(tag));
  return [...new Set(kept)];
}

// The tags the catalog starts with (D58), each group in its order: a day's meals, cuisines A to
// Z, then diets. The migrations add the same ones (0013, and 0018's "meal prep", D78). Every
// recipe form offers them (suggestedTags).
export const STARTING_TAGS: Record<TagCategory, readonly string[]> = {
  meal: [
    "breakfast",
    "lunch",
    "dinner",
    "side dish",
    "snack",
    "dessert",
    "drink",
    "meal prep",
  ],
  cuisine: [
    "american",
    "asian",
    "greek",
    "indian",
    "italian",
    "mediterranean",
    "mexican",
    "middle eastern",
    "swedish",
  ],
  diet: ["vegetarian", "vegan", "gluten-free", "dairy-free", "high-protein"],
};
