import { MAX_PHOTOS } from "@/src/entities/models/recipe-draft.model";

// What a chosen file is read as (docs/ux-plan.md D53). Phones don't always give a file's type
// (a .md from Files often has none), so its name's extension counts too.
export type RecipeFileKind = "photo" | "pdf" | "text";

const TEXT_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];

export function recipeFileKind(file: {
  name: string;
  type: string;
}): RecipeFileKind | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "photo";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    TEXT_TYPES.includes(file.type) ||
    TEXT_EXTENSIONS.some((extension) => name.endsWith(extension))
  ) {
    return "text";
  }
  return null;
}

// What a choice of files is read as (D53): one file of any kind, or up to MAX_PHOTOS photos of
// one recipe; never a mix, nor several PDFs or text files.
export function chosenFilesKind(
  files: { name: string; type: string }[],
): RecipeFileKind | null {
  const kinds = files.map(recipeFileKind);
  if (kinds.length === 0 || kinds.includes(null)) return null;
  if (kinds.length === 1) return kinds[0] ?? null;
  return kinds.length <= MAX_PHOTOS && kinds.every((kind) => kind === "photo")
    ? "photo"
    : null;
}

// What the picker offers: by type, and by extension for files that come without one.
export const RECIPE_FILE_ACCEPT = [
  "image/*",
  "application/pdf",
  ".pdf",
  ...TEXT_TYPES,
  ...TEXT_EXTENSIONS,
].join(",");
