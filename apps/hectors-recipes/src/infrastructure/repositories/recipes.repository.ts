import { randomUUID } from "node:crypto";
import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  ingredients,
  recipeIngredients,
  recipeSteps,
  recipes,
} from "@/db/schema";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { Aisle } from "@/src/entities/aisles";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  CreateRecipeRecord,
  ListedRecipe,
  RecipeWithIngredients,
  UpdateRecipeRecord,
} from "@/src/entities/models/recipe.model";
import type { RecipeLineWrite } from "@/src/entities/models/recipe-ingredient.model";
import type { RecipeStepWrite } from "@/src/entities/models/recipe-step.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const recipeColumns = {
  id: recipes.id,
  spaceId: recipes.spaceId,
  createdBy: recipes.createdBy,
  title: recipes.title,
  description: recipes.description,
  timeMinutes: recipes.timeMinutes,
  yieldServings: recipes.yieldServings,
  tags: recipes.tags,
  sourceUrl: recipes.sourceUrl,
  imageUrl: recipes.imageUrl,
  copiedFromRecipeId: recipes.copiedFromRecipeId,
  externalRef: recipes.externalRef,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
};

export class RecipesRepository
  extends BaseRepository
  implements IRecipesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "recipes");
  }

  async create(
    input: CreateRecipeRecord,
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients> {
    const executor = this.getDbContext(tx);

    try {
      const [id] = await this.insertRecipes(executor, [input], spaceId, userId);
      const [recipe] = id ? await this.loadByIds(executor, [id]) : [];
      if (!recipe) {
        throw new DatabaseOperationError("Failed to load created recipe");
      }

      this.logger.debug("Created recipe", { recipeId: id, spaceId, userId });
      return recipe;
    } catch (err) {
      this.handleError(err, "create", { spaceId, userId });
    }
  }

  async createMany(
    inputs: CreateRecipeRecord[],
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<number> {
    try {
      const ids = await this.insertRecipes(
        this.getDbContext(tx),
        inputs,
        spaceId,
        userId,
      );
      this.logger.debug("Created recipes", { count: ids.length, spaceId });
      return ids.length;
    } catch (err) {
      this.handleError(err, "createMany", { spaceId, userId });
    }
  }

  async getBySpace(spaceId: string): Promise<ListedRecipe[]> {
    try {
      return await this.getDbContext()
        .select({
          ...recipeColumns,
          ingredientNames: sql<string[]>`coalesce((
            select array_agg(${recipeIngredients.name} order by ${recipeIngredients.position})
            from ${recipeIngredients}
            where ${recipeIngredients.recipeId} = ${recipes.id}
              and ${recipeIngredients.name} is not null
          ), '{}')`,
        })
        .from(recipes)
        .where(eq(recipes.spaceId, spaceId))
        .orderBy(asc(recipes.title));
    } catch (err) {
      this.handleError(err, "getBySpace", { spaceId });
    }
  }

  async getById(
    id: string,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients | undefined> {
    try {
      const [recipe] = await this.loadByIds(this.getDbContext(tx), [id]);
      return recipe;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async getByIds(
    ids: string[],
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients[]> {
    try {
      return await this.loadByIds(this.getDbContext(tx), ids);
    } catch (err) {
      this.handleError(err, "getByIds", { count: ids.length });
    }
  }

  async update(
    id: string,
    input: UpdateRecipeRecord,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients> {
    const executor = this.getDbContext(tx);

    try {
      // Drizzle skips undefined fields, so only what was provided changes.
      const {
        ingredients: nextIngredients,
        steps: nextSteps,
        ...fields
      } = input;
      const [updated] = await executor
        .update(recipes)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(recipes.id, id))
        .returning({ id: recipes.id });

      if (!updated) {
        throw new DatabaseOperationError("Failed to update recipe");
      }

      if (nextIngredients) {
        await executor
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id));
        await this.insertLines(executor, [
          { recipeId: id, lines: nextIngredients },
        ]);
      }
      if (nextSteps) {
        await executor.delete(recipeSteps).where(eq(recipeSteps.recipeId, id));
        await this.insertSteps(executor, [{ recipeId: id, steps: nextSteps }]);
      }

      const [recipe] = await this.loadByIds(executor, [id]);
      if (!recipe) {
        throw new DatabaseOperationError("Failed to load updated recipe");
      }

      this.logger.debug("Updated recipe", { recipeId: id });
      return recipe;
    } catch (err) {
      this.handleError(err, "update", { id });
    }
  }

  async delete(id: string, tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).delete(recipes).where(eq(recipes.id, id));
      this.logger.debug("Deleted recipe", { recipeId: id });
    } catch (err) {
      this.handleError(err, "delete", { id });
    }
  }

  // Three queries however many recipes: the rows, all their lines, all their steps.
  private async loadByIds(
    executor: Database,
    ids: string[],
  ): Promise<RecipeWithIngredients[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) {
      return [];
    }

    const [rows, lines, steps] = await Promise.all([
      executor
        .select(recipeColumns)
        .from(recipes)
        .where(inArray(recipes.id, uniqueIds)),
      executor
        .select()
        .from(recipeIngredients)
        .where(inArray(recipeIngredients.recipeId, uniqueIds))
        .orderBy(asc(recipeIngredients.position)),
      executor
        .select()
        .from(recipeSteps)
        .where(inArray(recipeSteps.recipeId, uniqueIds))
        .orderBy(asc(recipeSteps.position)),
    ]);

    return rows.map((recipe) => ({
      ...recipe,
      ingredients: lines.filter((line) => line.recipeId === recipe.id),
      steps: steps.filter((step) => step.recipeId === recipe.id),
    }));
  }

  // Ids are generated here rather than read back from RETURNING, whose row order
  // Postgres doesn't promise, so each recipe's lines can't end up on another.
  private async insertRecipes(
    executor: Database,
    inputs: CreateRecipeRecord[],
    spaceId: string,
    userId: string,
  ): Promise<string[]> {
    if (!inputs.length) {
      return [];
    }

    const rows = inputs.map((input) => ({
      id: randomUUID(),
      spaceId,
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      timeMinutes: input.timeMinutes ?? null,
      yieldServings: input.yieldServings ?? null,
      tags: input.tags ?? [],
      sourceUrl: input.sourceUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      externalRef: input.externalRef ?? null,
      copiedFromRecipeId: input.copiedFromRecipeId ?? null,
    }));

    await executor.insert(recipes).values(rows);
    await this.insertLines(
      executor,
      rows.map((row, index) => ({
        recipeId: row.id,
        lines: inputs[index]?.ingredients ?? [],
      })),
    );
    await this.insertSteps(
      executor,
      rows.map((row, index) => ({
        recipeId: row.id,
        steps: inputs[index]?.steps ?? [],
      })),
    );
    return rows.map((row) => row.id);
  }

  private async insertLines(
    executor: Database,
    entries: { recipeId: string; lines: RecipeLineWrite[] }[],
  ): Promise<void> {
    const ingredientIds = await this.upsertIngredientNames(
      executor,
      entries.flatMap(({ lines }) =>
        lines.flatMap((line) =>
          line.catalogName
            ? [{ name: line.catalogName, aisle: line.aisle ?? null }]
            : [],
        ),
      ),
    );

    const values = entries.flatMap(({ recipeId, lines }) =>
      lines.map((line, position) => ({
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
          (line.catalogName
            ? (ingredientIds.get(line.catalogName) ?? null)
            : null),
      })),
    );
    if (values.length) {
      await executor.insert(recipeIngredients).values(values);
    }
  }

  private async insertSteps(
    executor: Database,
    entries: { recipeId: string; steps: RecipeStepWrite[] }[],
  ): Promise<void> {
    const values = entries.flatMap(({ recipeId, steps }) =>
      steps.map((step, position) => ({ recipeId, position, ...step })),
    );
    if (values.length) {
      await executor.insert(recipeSteps).values(values);
    }
  }

  // Adds new names to the catalog, and fills an aisle where the catalog has none; an aisle
  // already there is never overwritten.
  private async upsertIngredientNames(
    executor: Database,
    entries: { name: string; aisle: Aisle | null }[],
  ): Promise<Map<string, string>> {
    const aisleByName = new Map<string, Aisle | null>();
    for (const { name, aisle } of entries) {
      aisleByName.set(name, aisleByName.get(name) ?? aisle);
    }
    const uniqueNames = [...aisleByName.keys()];
    const idsByName = new Map<string, string>();
    if (!uniqueNames.length) {
      return idsByName;
    }

    await executor
      .insert(ingredients)
      .values([...aisleByName].map(([name, aisle]) => ({ name, aisle })))
      .onConflictDoUpdate({
        target: ingredients.name,
        set: { aisle: sql`excluded.aisle` },
        setWhere: sql`${ingredients.aisle} is null and excluded.aisle is not null`,
      });

    const rows = await executor
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .where(inArray(ingredients.name, uniqueNames));

    for (const row of rows) {
      idsByName.set(row.name, row.id);
    }
    return idsByName;
  }
}
