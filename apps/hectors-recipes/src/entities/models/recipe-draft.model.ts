import { z } from "zod";
import { AISLES } from "../aisles";
import { UNITS } from "../ingredient-line";

// What a recipe is read from: pasted text, a photo or screenshot (ux-plan D29), or a PDF (D53).
// A photo is one image, or a long screenshot cut into pieces, top to bottom (P14.11).
export type RecipeImage = { data: Uint8Array; mediaType: string };
export type RecipeSource =
  | { kind: "text"; text: string }
  | { kind: "image"; images: RecipeImage[] }
  | { kind: "document"; pdf: Uint8Array };

// The most pages a PDF read as one recipe may have (D53): none needs more, and a cookbook's
// worth would be read, and paid for, page by page.
export const MAX_PDF_PAGES = 10;

// The most pieces a long screenshot is cut into, and the most a photo's pieces may weigh in
// all: Vercel refuses a request body over 4.5 MB, and the form needs a little room too.
export const MAX_PHOTO_PIECES = 6;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
// The most text read as one recipe: a pasted recipe, a page's text, or a text file (D53).
export const MAX_RECIPE_TEXT = 50_000;

// How many AI reads one account gets in 24 hours (docs/ux-plan.md D48).
export const DAILY_RECIPE_READS = 20;

// A recipe read with AI, itemized, for someone to review before anything is saved
// (ux-plan D26, D29). Each line keeps the source's words in `raw`, and suggests an aisle
// for its catalog ingredient. `unsure` lists what the reader couldn't make out.
const recipeDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  timeMinutes: z.number().int().positive().nullable(),
  yieldServings: z.number().int().positive().nullable(),
  ingredients: z.array(
    z.object({
      raw: z.string().min(1),
      section: z.string().nullable(),
      quantity: z.number().positive().nullable(),
      unit: z.enum(UNITS).nullable(),
      name: z.string().nullable(),
      note: z.string().nullable(),
      optional: z.boolean(),
      catalogName: z.string().nullable(),
      aisle: z.enum(AISLES).nullable(),
    }),
  ),
  steps: z.array(
    z.object({
      text: z.string().min(1),
      timerMinutes: z.number().int().positive().nullable(),
      // The heading over it (D35), when the source groups its steps.
      section: z.string().nullable(),
    }),
  ),
  unsure: z.array(z.string()),
});
export type RecipeDraft = z.infer<typeof recipeDraftSchema>;

// One line's fields as a reader gave them (the AI reader, or Claude's one-time re-read), for
// checkLineReading to hold to the line's own words.
export type LineReading = Omit<
  RecipeDraft["ingredients"][number],
  "raw" | "section"
>;
