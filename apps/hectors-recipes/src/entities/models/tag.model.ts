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
