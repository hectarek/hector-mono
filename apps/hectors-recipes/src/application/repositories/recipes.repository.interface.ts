import type {
  CreateRecipeRecord,
  ListedRecipe,
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
  // Library listing: recipe rows with their ingredients' names (for search), not their lines.
  getBySpace(spaceId: string): Promise<ListedRecipe[]>;
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
  // Its view-only public link (docs/ux-plan.md D98): the token while it's on, else null.
  getShareToken(id: string, tx?: ITransaction): Promise<string | null>;
  // Turns the link on (keeping the token it has, or making a new one) or off; returns the
  // token, or null.
  setShared(
    id: string,
    shared: boolean,
    tx?: ITransaction,
  ): Promise<string | null>;
  // The recipe a public link opens, while the link is on.
  getIdByShareToken(token: string): Promise<string | undefined>;
}
