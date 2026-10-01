import type { IRecipeReaderService } from "@/src/application/services/recipe-reader.service.interface";
import {
  RecipeReadError,
  type RecipeReadFailure,
} from "@/src/entities/errors/common";
import type {
  RecipeDraft,
  RecipeSource,
} from "@/src/entities/models/recipe-draft.model";

// Records what it was asked to read, and returns `draft` or fails with `failWith`.
export class MockRecipeReaderService implements IRecipeReaderService {
  readonly sources: RecipeSource[] = [];
  failWith: RecipeReadFailure | null = null;
  draft: RecipeDraft = {
    title: "Chili",
    description: null,
    timeMinutes: null,
    yieldServings: null,
    ingredients: [
      {
        raw: "1 lb beans",
        section: null,
        quantity: 1,
        unit: "lb",
        name: "beans",
        note: null,
        optional: false,
        catalogName: "bean",
        aisle: "canned-and-jarred",
      },
    ],
    steps: [{ text: "Simmer.", timerMinutes: null, section: null }],
    unsure: [],
  };

  async read(source: RecipeSource): Promise<RecipeDraft> {
    this.sources.push(source);
    if (this.failWith) {
      throw new RecipeReadError(this.failWith);
    }
    return this.draft;
  }
}
