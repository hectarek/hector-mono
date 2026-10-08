import type {
  DraftReview,
  RecipeFormValues,
} from "@/app/_components/recipe-form";
import { rowsFromLines, stepRowsFrom } from "@/src/entities/editor-rows";
import type { CheckedDraft } from "@/src/entities/itemizing-check";

// An import's checked draft as the new-recipe form's starting values (ux-plan P10.1), and
// what the form asks them to check. A link gives its page's address and photo too.
export function draftFormValues(
  draft: CheckedDraft,
  from: { sourceUrl?: string; imageUrl?: string | null } = {},
): { values: RecipeFormValues; review: DraftReview } {
  return {
    values: {
      title: draft.title,
      description: draft.description ?? "",
      ingredients: rowsFromLines(draft.ingredients),
      steps: stepRowsFrom(draft.steps),
      yieldServings:
        draft.yieldServings === null ? "" : String(draft.yieldServings),
      timeMinutes: draft.timeMinutes === null ? "" : String(draft.timeMinutes),
      tags: [],
      sourceUrl: from.sourceUrl ?? "",
      imageUrl: from.imageUrl ?? "",
      videoUrl: "",
    },
    review: { unsure: draft.unsure, flagged: draft.flagged },
  };
}
