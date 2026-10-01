import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  CreateRecipeRecord,
  Recipe,
  RecipeWithIngredients,
  UpdateRecipeRecord,
} from "@/src/entities/models/recipe.model";
import type {
  RecipeIngredient,
  RecipeLineWrite,
} from "@/src/entities/models/recipe-ingredient.model";
import type {
  RecipeStep,
  RecipeStepWrite,
} from "@/src/entities/models/recipe-step.model";

export class MockRecipesRepository implements IRecipesRepository {
  private recipes: Recipe[] = [];
  private lines: RecipeIngredient[] = [];
  private steps: RecipeStep[] = [];
  private ingredientIds = new Map<string, string>();

  // Tests pass the mock plan entries' unlinkRecipe, standing in for the foreign key.
  constructor(private readonly onDelete?: (recipeId: string) => void) {}

  async create(
    input: CreateRecipeRecord,
    spaceId: string,
    userId: string,
  ): Promise<RecipeWithIngredients> {
    const now = new Date();
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      spaceId,
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      timeMinutes: input.timeMinutes ?? null,
      yieldServings: input.yieldServings ?? null,
      tags: input.tags ?? [],
      sourceUrl: input.sourceUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      copiedFromRecipeId: input.copiedFromRecipeId ?? null,
      externalRef: input.externalRef ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.recipes.push(recipe);
    this.replaceLines(recipe.id, input.ingredients);
    this.replaceSteps(recipe.id, input.steps);
    return this.withLines(recipe);
  }

  async createMany(
    inputs: CreateRecipeRecord[],
    spaceId: string,
    userId: string,
  ): Promise<number> {
    for (const input of inputs) {
      await this.create(input, spaceId, userId);
    }
    return inputs.length;
  }

  async getBySpace(spaceId: string): Promise<Recipe[]> {
    return this.recipes
      .filter((recipe) => recipe.spaceId === spaceId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getById(id: string): Promise<RecipeWithIngredients | undefined> {
    const recipe = this.recipes.find((candidate) => candidate.id === id);
    return recipe ? this.withLines(recipe) : undefined;
  }

  async getByIds(ids: string[]): Promise<RecipeWithIngredients[]> {
    return this.recipes
      .filter((recipe) => ids.includes(recipe.id))
      .map((recipe) => this.withLines(recipe));
  }

  async update(
    id: string,
    input: UpdateRecipeRecord,
  ): Promise<RecipeWithIngredients> {
    const index = this.recipes.findIndex((recipe) => recipe.id === id);
    const existing = this.recipes[index];
    if (!existing) {
      throw new DatabaseOperationError("Recipe not found");
    }

    const { ingredients, steps, ...fields } = input;
    const updated: Recipe = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
      updatedAt: new Date(),
    };

    this.recipes[index] = updated;
    if (ingredients) {
      this.replaceLines(id, ingredients);
    }
    if (steps) {
      this.replaceSteps(id, steps);
    }
    return this.withLines(updated);
  }

  async delete(id: string): Promise<void> {
    this.onDelete?.(id);
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id);
    this.lines = this.lines.filter((line) => line.recipeId !== id);
    this.steps = this.steps.filter((step) => step.recipeId !== id);
  }

  private replaceLines(recipeId: string, lines: RecipeLineWrite[]): void {
    this.lines = [
      ...this.lines.filter((line) => line.recipeId !== recipeId),
      ...lines.map((line, position) => ({
        recipeId,
        position,
        section: line.section ?? null,
        raw: line.raw,
        quantity: line.quantity,
        unit: line.unit,
        name: line.name,
        note: line.note,
        optional: line.optional,
        ingredientId:
          line.ingredientId ??
          (line.catalogName ? this.ingredientIdFor(line.catalogName) : null),
      })),
    ];
  }

  private replaceSteps(recipeId: string, steps: RecipeStepWrite[]): void {
    this.steps = [
      ...this.steps.filter((step) => step.recipeId !== recipeId),
      ...steps.map((step, position) => ({ recipeId, position, ...step })),
    ];
  }

  private withLines(recipe: Recipe): RecipeWithIngredients {
    return {
      ...recipe,
      ingredients: this.lines
        .filter((line) => line.recipeId === recipe.id)
        .sort((a, b) => a.position - b.position),
      steps: this.steps
        .filter((step) => step.recipeId === recipe.id)
        .sort((a, b) => a.position - b.position),
    };
  }

  private ingredientIdFor(name: string): string {
    const existing = this.ingredientIds.get(name);
    if (existing) {
      return existing;
    }
    const id = crypto.randomUUID();
    this.ingredientIds.set(name, id);
    return id;
  }
}
