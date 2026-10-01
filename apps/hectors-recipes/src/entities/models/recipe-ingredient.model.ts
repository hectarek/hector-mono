import { z } from "zod";
import { AISLES, type Aisle } from "../aisles";
import { itemizeLine, lineText } from "../ingredient-item";
import { toCatalogName, UNITS } from "../ingredient-line";

export const recipeIngredientSchema = z.object({
  recipeId: z.uuid(),
  position: z.number().int().nonnegative(),
  section: z.string().nullable(),
  // The original line as written; the fields below are its itemized form (ux-plan D23).
  raw: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.string().nullable(),
  ingredientId: z.uuid().nullable(),
  name: z.string().nullable(),
  note: z.string().nullable(),
  optional: z.boolean(),
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

// A line as the editor sends it: its fields, with `raw` only while the row is untouched
// (its original line). A line with only `raw` (pasted text, an import) is itemized from it.
export const recipeIngredientInputSchema = z
  .object({
    raw: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    quantity: z.number().positive().nullable().optional(),
    unit: z.enum(UNITS).nullable().optional(),
    note: z.string().trim().min(1).nullable().optional(),
    optional: z.boolean().optional(),
    // An import reader's suggestion for the catalog ingredient (D25).
    aisle: z.enum(AISLES).nullable().optional(),
  })
  .refine((line) => line.raw !== undefined || line.name !== undefined, {
    message: "Each ingredient needs a name",
  });
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;

// A line ready to store: the original line plus its itemized fields. The catalog link is
// found by `catalogName`, unless it's carried over (`ingredientId`): a copy brings the source
// line's, and an edit keeps a line's while its name is unchanged. An `aisle` (from the AI
// reader) fills the catalog ingredient's aisle only where it has none.
export type RecipeLineWrite = {
  raw: string;
  section?: string;
} & Pick<
  RecipeIngredient,
  "quantity" | "unit" | "name" | "note" | "optional"
> & {
    catalogName: string | null;
    ingredientId?: string | null;
    aisle?: Aisle | null;
  };

// `links` maps a line's name to the catalog ingredient it's already linked to (a recipe's
// current lines, on an edit), so an unchanged name keeps its link.
export function toLineWrites(
  lines: RecipeIngredientInput[],
  links: ReadonlyMap<string, string> = new Map(),
): RecipeLineWrite[] {
  return lines.map((line) => {
    const { catalogName, ...fields } =
      line.name === undefined
        ? itemizeLine(line.raw ?? "")
        : {
            quantity: line.quantity ?? null,
            unit: line.unit ?? null,
            name: line.name,
            note: line.note ?? null,
            optional: line.optional ?? false,
            catalogName: toCatalogName(line.name),
          };
    const ingredientId = fields.name ? links.get(fields.name) : undefined;
    return {
      raw:
        line.raw ??
        (fields.name ? lineText({ ...fields, name: fields.name }) : ""),
      section: line.section,
      ...fields,
      catalogName,
      ...(ingredientId ? { ingredientId } : {}),
      ...(line.aisle ? { aisle: line.aisle } : {}),
    };
  });
}
