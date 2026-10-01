import type {
  CreateRecipeRecord,
  Recipe,
  RecipeWithIngredients,
  UpdateRecipeRecord,
} from "@/src/entities/models/recipe.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface IRecipesRepository {
  create(
    record: CreateRecipeRecord,
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients>;
  // Bulk insert (copying recipes between books); returns how many were created.
  createMany(
    records: CreateRecipeRecord[],
    spaceId: string,
    userId: string,
    tx?: ITransaction,
  ): Promise<number>;
  // Library listing: recipe rows only, no ingredient lines.
  getBySpace(spaceId: string): Promise<Recipe[]>;
  getById(
    id: string,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients | undefined>;
  // Each found recipe once, in no particular order; missing ids are left out.
  getByIds(ids: string[], tx?: ITransaction): Promise<RecipeWithIngredients[]>;
  update(
    id: string,
    record: UpdateRecipeRecord,
    tx?: ITransaction,
  ): Promise<RecipeWithIngredients>;
  delete(id: string, tx?: ITransaction): Promise<void>;
}
