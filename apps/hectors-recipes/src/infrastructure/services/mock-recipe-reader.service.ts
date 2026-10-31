import type { IRecipeReaderService } from "@/src/application/services/recipe-reader.service.interface";
import {
  RecipeReadError,
  type RecipeReadFailure,
} from "@/src/entities/errors/common";
import type {
  RecipeDraft,
  RecipeSource,
} from "@/src/entities/models/recipe-draft.model";

// Records what it was asked to read and the tags it was offered, and returns `draft` or fails
// with `failWith`.
export class MockRecipeReaderService implements IRecipeReaderService {
  readonly sources: RecipeSource[] = [];
  readonly offered: string[][] = [];
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
    tags: [],
    unsure: [],
  };

  async read(source: RecipeSource, tags: string[]): Promise<RecipeDraft> {
    this.sources.push(source);
    this.offered.push(tags);
    if (this.failWith) {
      throw new RecipeReadError(this.failWith);
    }
    return this.draft;
  }
}
