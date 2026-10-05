import type { Recipe } from "./models/recipe.model";
import type { TagGroups } from "./models/tag.model";

export type LibraryFilter = {
  search?: string;
  tag?: string;
};

export type LibraryView = {
  recipes: Recipe[];
  tags: string[];
  // Every grouped tag's group (D55), for grouping and the tag picker.
  tagGroups: TagGroups;
};

// Tags come from the whole book so the chips don't disappear as you filter. Most-used
// first: on a phone only the first few chips are in view.
export function buildLibraryView(
  recipes: Recipe[],
  filter: LibraryFilter,
  tagGroups: TagGroups = {},
): LibraryView {
  const tag = filter.tag?.trim().toLowerCase();

  const counts = new Map<string, number>();
  for (const recipeTag of recipes.flatMap((recipe) => recipe.tags)) {
    counts.set(recipeTag, (counts.get(recipeTag) ?? 0) + 1);
  }
  const tags = [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
  );
  const matching = recipes.filter(
    (recipe) =>
      matchesSearch(recipe, filter.search) &&
      (!tag || recipe.tags.includes(tag)),
  );

  return { recipes: matching, tags, tagGroups };
}

// The library's search: its text anywhere in the title, ignoring case. The server filters
// with it, and so does the page as you type (ux-plan P10.4), so both always agree.
export function matchesSearch(
  recipe: Pick<Recipe, "title">,
  search: string | undefined,
): boolean {
  const text = search?.trim().toLowerCase();
  return !text || recipe.title.toLowerCase().includes(text);
}
