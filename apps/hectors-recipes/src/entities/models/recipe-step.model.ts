import { z } from "zod";
import { stepsFromMarkdown, withSections } from "../step-text";

// A recipe's step, itemized (ux-plan D24): its text, an optional timer, and the section it's
// in (D35).
export const recipeStepSchema = z.object({
  recipeId: z.uuid(),
  position: z.number().int().nonnegative(),
  text: z.string().min(1),
  timerMinutes: z.number().int().positive().nullable(),
  section: z.string().nullable(),
});
export type RecipeStep = z.infer<typeof recipeStepSchema>;

export const recipeStepInputSchema = z.object({
  text: z.string().trim().min(1),
  timerMinutes: z.number().int().positive().nullable().optional(),
  section: z.string().trim().min(1).optional(),
});
export type RecipeStepInput = z.infer<typeof recipeStepInputSchema>;

export type RecipeStepWrite = Pick<
  RecipeStep,
  "text" | "timerMinutes" | "section"
>;

export function toStepWrite(step: RecipeStepInput): RecipeStepWrite {
  return {
    text: step.text,
    timerMinutes: step.timerMinutes ?? null,
    section: step.section ?? null,
  };
}

// Steps from a note's markdown method (the Obsidian seed).
export function toStepWrites(instructions: string): RecipeStepWrite[] {
  return withSections(stepsFromMarkdown(instructions)).map((step) => ({
    ...step,
    timerMinutes: null,
  }));
}
