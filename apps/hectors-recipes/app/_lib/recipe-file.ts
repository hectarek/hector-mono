// What a chosen file is read as (docs/ux-plan.md D53). Phones don't always give a file's type
// (a .md from Files often has none), so its name's extension counts too.
export type RecipeFileKind = "photo" | "text";

const TEXT_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];

export function recipeFileKind(file: {
  name: string;
  type: string;
}): RecipeFileKind | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "photo";
  if (
    TEXT_TYPES.includes(file.type) ||
    TEXT_EXTENSIONS.some((extension) => name.endsWith(extension))
  ) {
    return "text";
  }
  return null;
}

// What the picker offers: by type, and by extension for files that come without one.
export const RECIPE_FILE_ACCEPT = [
  "image/*",
  ...TEXT_TYPES,
  ...TEXT_EXTENSIONS,
].join(",");
