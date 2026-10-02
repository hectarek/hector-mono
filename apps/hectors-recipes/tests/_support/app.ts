// Every use case wired to one set of repositories, plus a few fixtures, so a test reads
// like the feature: make a book, add a recipe, share it. Inside describeEachBackend the
// same tests run twice: on the in-memory mocks and on the real repositories (PGlite).
import { beforeEach, describe } from "bun:test";
import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { addGroceryItemUseCase } from "@/src/application/use-cases/grocery/add-grocery-item.use-case";
import { addPlanToListUseCase } from "@/src/application/use-cases/grocery/add-plan-to-list.use-case";
import { addRecipesToListUseCase } from "@/src/application/use-cases/grocery/add-recipes-to-list.use-case";
import { clearCheckedItemsUseCase } from "@/src/application/use-cases/grocery/clear-checked-items.use-case";
import { getGroceryListUseCase } from "@/src/application/use-cases/grocery/get-grocery-list.use-case";
import { listMealsToAddUseCase } from "@/src/application/use-cases/grocery/list-meals-to-add.use-case";
import { removeGroceryItemUseCase } from "@/src/application/use-cases/grocery/remove-grocery-item.use-case";
import { setGroceryItemCheckedUseCase } from "@/src/application/use-cases/grocery/set-grocery-item-checked.use-case";
import { updateGroceryItemUseCase } from "@/src/application/use-cases/grocery/update-grocery-item.use-case";
import { addPlanEntryUseCase } from "@/src/application/use-cases/plan/add-plan-entry.use-case";
import { changeEntryDaysUseCase } from "@/src/application/use-cases/plan/change-entry-days.use-case";
import { getWeekPlanUseCase } from "@/src/application/use-cases/plan/get-week-plan.use-case";
import { removePlanEntryUseCase } from "@/src/application/use-cases/plan/remove-plan-entry.use-case";
import { setEntryCookedUseCase } from "@/src/application/use-cases/plan/set-entry-cooked.use-case";
import { grantPlanSubscriptionUseCase } from "@/src/application/use-cases/realtime/grant-plan-subscription.use-case";
import { adoptRecipesUseCase } from "@/src/application/use-cases/recipes/adopt-recipes.use-case";
import { createRecipeUseCase } from "@/src/application/use-cases/recipes/create-recipe.use-case";
import { deleteRecipeUseCase } from "@/src/application/use-cases/recipes/delete-recipe.use-case";
import { getAllRecipesUseCase } from "@/src/application/use-cases/recipes/get-all-recipes.use-case";
import { getRecipeUseCase } from "@/src/application/use-cases/recipes/get-recipe.use-case";
import { getRecipesUseCase } from "@/src/application/use-cases/recipes/get-recipes.use-case";
import { updateRecipeUseCase } from "@/src/application/use-cases/recipes/update-recipe.use-case";
import { acceptInviteUseCase } from "@/src/application/use-cases/spaces/accept-invite.use-case";
import { createInviteUseCase } from "@/src/application/use-cases/spaces/create-invite.use-case";
import { createSpaceUseCase } from "@/src/application/use-cases/spaces/create-space.use-case";
import { deleteSpaceUseCase } from "@/src/application/use-cases/spaces/delete-space.use-case";
import { ensureInviteLinksUseCase } from "@/src/application/use-cases/spaces/ensure-invite-links.use-case";
import { ensurePersonalSpaceUseCase } from "@/src/application/use-cases/spaces/ensure-personal-space.use-case";
import { getSpaceSettingsUseCase } from "@/src/application/use-cases/spaces/get-space-settings.use-case";
import { listMySpacesUseCase } from "@/src/application/use-cases/spaces/list-my-spaces.use-case";
import { previewInviteUseCase } from "@/src/application/use-cases/spaces/preview-invite.use-case";
import { removeMemberUseCase } from "@/src/application/use-cases/spaces/remove-member.use-case";
import { renameSpaceUseCase } from "@/src/application/use-cases/spaces/rename-space.use-case";
import { revokeInviteUseCase } from "@/src/application/use-cases/spaces/revoke-invite.use-case";
import { setDefaultSpaceUseCase } from "@/src/application/use-cases/spaces/set-default-space.use-case";
import { updateMemberRoleUseCase } from "@/src/application/use-cases/spaces/update-member-role.use-case";
import type { CreateRecipeInput } from "@/src/entities/models/recipe.model";
import type { InviteRole, SpaceType } from "@/src/entities/models/space.model";
import { GroceryItemsRepository } from "@/src/infrastructure/repositories/grocery-items.repository";
import { MockGroceryItemsRepository } from "@/src/infrastructure/repositories/grocery-items.repository.mock";
import { PlanEntriesRepository } from "@/src/infrastructure/repositories/plan-entries.repository";
import { MockPlanEntriesRepository } from "@/src/infrastructure/repositories/plan-entries.repository.mock";
import { RecipesRepository } from "@/src/infrastructure/repositories/recipes.repository";
import { MockRecipesRepository } from "@/src/infrastructure/repositories/recipes.repository.mock";
import { SpacesRepository } from "@/src/infrastructure/repositories/spaces.repository";
import { MockSpacesRepository } from "@/src/infrastructure/repositories/spaces.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockRealtimeService } from "@/src/infrastructure/services/mock-realtime.service";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { addAuthUser, resetDatabase } from "@/tests/_support/database";

export const OWNER = "00000000-0000-4000-8000-000000000001";
export const PARTNER = "00000000-0000-4000-8000-000000000002";
export const STRANGER = "00000000-0000-4000-8000-000000000003";
// A Monday, for week-based tests.
export const MONDAY = "2026-09-21";

export type Repositories = {
  spaces: ISpacesRepository;
  recipes: IRecipesRepository;
  planEntries: IPlanEntriesRepository;
  groceryItems: IGroceryItemsRepository;
  transactions: ITransactionManagerService;
};

function mockRepositories(): Repositories {
  const planEntries = new MockPlanEntriesRepository();
  return {
    spaces: new MockSpacesRepository(),
    recipes: new MockRecipesRepository((id) => planEntries.unlinkRecipe(id)),
    planEntries,
    groceryItems: new MockGroceryItemsRepository(),
    transactions: new MockTransactionManagerService(),
  };
}

// The real repositories, over the PGlite test database (see preload.ts).
export function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
    spaces: new SpacesRepository(log),
    recipes: new RecipesRepository(log),
    planEntries: new PlanEntriesRepository(log),
    groceryItems: new GroceryItemsRepository(log),
    transactions: new TransactionManagerService(log),
  };
}

type Backend = {
  name: string;
  reset: () => Promise<void>;
  repositories: () => Repositories;
};
const MOCK: Backend = {
  name: "mock",
  reset: async () => {},
  repositories: mockRepositories,
};
const POSTGRES: Backend = {
  name: "postgres",
  reset: resetDatabase,
  repositories: postgresRepositories,
};
// Outside describeEachBackend, makeApp() uses the mocks.
let currentBackend = MOCK;

// Runs the block once per backend. Inside it, makeApp() uses that backend's repositories,
// and the database is emptied before each test. A test that passes on "mock" but fails
// on "postgres" means the mock has drifted from the real SQL.
export function describeEachBackend(name: string, fn: () => void): void {
  for (const backend of [MOCK, POSTGRES]) {
    describe(`${name} [${backend.name}]`, () => {
      beforeEach(async () => {
        currentBackend = backend;
        await backend.reset();
      });
      fn();
    });
  }
}

export function makeApp(repos: Repositories = currentBackend.repositories()) {
  const log = new MockLoggerService();
  const { spaces, recipes, planEntries, groceryItems, transactions } = repos;

  // What grocery writes would have published (ux-plan D21).
  const realtime = new MockRealtimeService();

  const app = {
    repos,
    realtime,

    createSpace: createSpaceUseCase(spaces, transactions, log),
    ensurePersonalSpace: ensurePersonalSpaceUseCase(spaces, transactions, log),
    listMySpaces: listMySpacesUseCase(spaces, log),
    setDefaultSpace: setDefaultSpaceUseCase(spaces, transactions, log),
    getSpaceSettings: getSpaceSettingsUseCase(spaces, log),
    renameSpace: renameSpaceUseCase(spaces, transactions, log),
    deleteSpace: deleteSpaceUseCase(spaces, transactions, log),
    createInvite: createInviteUseCase(spaces, transactions, log),
    revokeInvite: revokeInviteUseCase(spaces, transactions, log),
    ensureInviteLinks: ensureInviteLinksUseCase(spaces, transactions, log),
    previewInvite: previewInviteUseCase(spaces, planEntries, groceryItems, log),
    acceptInvite: acceptInviteUseCase(
      spaces,
      planEntries,
      groceryItems,
      transactions,
      log,
    ),
    updateMemberRole: updateMemberRoleUseCase(spaces, transactions, log),
    removeMember: removeMemberUseCase(spaces, transactions, log),

    createRecipe: createRecipeUseCase(recipes, spaces, transactions, log),
    getRecipe: getRecipeUseCase(recipes, spaces, log),
    getRecipes: getRecipesUseCase(recipes, spaces, log),
    getAllRecipes: getAllRecipesUseCase(recipes, spaces, log),
    updateRecipe: updateRecipeUseCase(recipes, spaces, transactions, log),
    deleteRecipe: deleteRecipeUseCase(recipes, spaces, transactions, log),
    adoptRecipes: adoptRecipesUseCase(recipes, spaces, transactions, log),

    getWeekPlan: getWeekPlanUseCase(planEntries, recipes, spaces, log),
    addPlanEntry: addPlanEntryUseCase(
      planEntries,
      recipes,
      spaces,
      transactions,
      log,
    ),
    setEntryCooked: setEntryCookedUseCase(
      planEntries,
      spaces,
      transactions,
      log,
    ),
    removePlanEntry: removePlanEntryUseCase(
      planEntries,
      spaces,
      transactions,
      log,
    ),
    changeEntryDays: changeEntryDaysUseCase(
      planEntries,
      spaces,
      transactions,
      log,
    ),

    getGroceryList: getGroceryListUseCase(groceryItems, spaces, log),
    addGroceryItem: addGroceryItemUseCase(
      groceryItems,
      spaces,
      transactions,
      realtime,
      log,
    ),
    setGroceryItemChecked: setGroceryItemCheckedUseCase(
      groceryItems,
      spaces,
      transactions,
      realtime,
      log,
    ),
    removeGroceryItem: removeGroceryItemUseCase(
      groceryItems,
      spaces,
      transactions,
      realtime,
      log,
    ),
    updateGroceryItem: updateGroceryItemUseCase(
      groceryItems,
      spaces,
      transactions,
      realtime,
      log,
    ),
    clearCheckedItems: clearCheckedItemsUseCase(
      groceryItems,
      spaces,
      transactions,
      realtime,
      log,
    ),
    addRecipesToList: addRecipesToListUseCase(
      groceryItems,
      recipes,
      spaces,
      transactions,
      realtime,
      log,
    ),
    addPlanToList: addPlanToListUseCase(
      groceryItems,
      planEntries,
      recipes,
      spaces,
      transactions,
      realtime,
      log,
    ),
    listMealsToAdd: listMealsToAddUseCase(planEntries, spaces, log),

    grantPlanSubscription: grantPlanSubscriptionUseCase(spaces, realtime, log),

    // Fixtures

    async newSpace(
      type: SpaceType,
      ownerId: string = OWNER,
      name = "Home",
    ): Promise<string> {
      return (await app.createSpace({ type, name }, ownerId)).id;
    },

    async newRecipe(
      bookId: string,
      input: Partial<CreateRecipeInput> = {},
      userId: string = OWNER,
    ) {
      return app.createRecipe(
        { title: "Chili", ingredients: [{ raw: "1 lb beans" }], ...input },
        bookId,
        userId,
      );
    },

    // A meal on a plan, cooked on `cookDate` and eaten that day unless `eatDates` says, from a
    // recipe of its own (in a book made for it) unless one is given.
    async planMeal(
      planId: string,
      cookDate: string,
      {
        eatDates = [cookDate],
        title = "Chili",
        recipeId,
        userId = OWNER,
      }: {
        eatDates?: string[];
        title?: string;
        recipeId?: string;
        userId?: string;
      } = {},
    ) {
      const recipe =
        recipeId ??
        (await app.newRecipe(await app.newSpace("recipe-book"), { title })).id;
      return app.addPlanEntry(
        { spaceId: planId, recipeId: recipe, cookDate, eatDates },
        userId,
      );
    },

    // The name on someone's account, as Neon Auth would have it.
    async nameUser(userId: string, name: string) {
      if (spaces instanceof MockSpacesRepository) {
        spaces.userNames.set(userId, name);
      } else {
        await addAuthUser(userId, name, `${userId}@example.com`);
      }
    },

    // Adds someone straight in, as if they'd accepted an invite.
    async join(spaceId: string, userId: string, role: InviteRole) {
      await spaces.addMember(spaceId, userId, role);
    },
  };
  return app;
}

export type TestApp = ReturnType<typeof makeApp>;
