import type { ListedRecipe } from "./models/recipe.model";
import {
  STARTING_TAGS,
  type TagCategory,
  type TagGroups,
} from "./models/tag.model";

export type LibraryFilter = {
  search?: string;
  tag?: string;
};

export type LibraryView = {
  recipes: ListedRecipe[];
  tags: string[];
  // Every grouped tag's group (D55), for grouping and the tag picker.
  tagGroups: TagGroups;
};

// Tags come from the whole book so the chips don't disappear as you filter. Most-used
// first: on a phone only the first few chips are in view.
export function buildLibraryView(
  recipes: ListedRecipe[],
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
  const matching = searchRecipes(
    recipes.filter((recipe) => !tag || recipe.tags.includes(tag)),
    filter.search,
  );

  return { recipes: matching, tags, tagGroups };
}

// The library's search (D56): every word typed is in the title, a tag or an ingredient's
// name, ignoring case and accents. Recipes with more of the words in their title come first,
// otherwise in the order given. The server searches with it, and so does the page as you
// type (ux-plan P10.4), so both always agree.
export function searchRecipes(
  recipes: ListedRecipe[],
  search: string | undefined,
): ListedRecipe[] {
  const words = fold(search ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return recipes;
  }

  return recipes
    .flatMap((recipe) => {
      const title = fold(recipe.title);
      const rest = fold([...recipe.tags, ...recipe.ingredientNames].join("\n"));
      return words.every((word) => title.includes(word) || rest.includes(word))
        ? [
            {
              recipe,
              inTitle: words.filter((word) => title.includes(word)).length,
            },
          ]
        : [];
    })
    .sort((a, b) => b.inTitle - a.inTitle)
    .map(({ recipe }) => recipe);
}

// One heading's recipes when the library is grouped; `tag` is null for Other.
export type RecipeGroup = { tag: string | null; recipes: ListedRecipe[] };

// The library grouped by one tag group (D57). A recipe is under each of its tags in the group,
// in the order given, and recipes with none are last, under Other. Headings follow the group:
// a day's meals and the diets in D58's order (any newer tag after them, A to Z), cuisines A to Z.
export function groupRecipes(
  recipes: ListedRecipe[],
  category: TagCategory,
  tagGroups: TagGroups,
): RecipeGroup[] {
  const byTag = new Map<string, ListedRecipe[]>();
  const other: ListedRecipe[] = [];
  for (const recipe of recipes) {
    const tags = recipe.tags.filter((tag) => tagGroups[tag] === category);
    if (tags.length === 0) {
      other.push(recipe);
    }
    for (const tag of tags) {
      byTag.set(tag, [...(byTag.get(tag) ?? []), recipe]);
    }
  }

  const order = category === "cuisine" ? [] : STARTING_TAGS[category];
  const rank = (tag: string) =>
    order.includes(tag) ? order.indexOf(tag) : order.length;
  const groups: RecipeGroup[] = [...byTag]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([tag, tagged]) => ({ tag, recipes: tagged }));
  return other.length > 0 ? [...groups, { tag: null, recipes: other }] : groups;
}

// Lowercase without accents, so "sable" finds "Sablé Cookies".
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
