import { beforeEach, describe, expect, it } from "bun:test";
import {
  addGroceryItem,
  addPlanToList,
  addRecipeToList,
  clearCheckedItems,
  clearGroceryList,
  removeGroceryItem,
  setGroceryItemChecked,
  updateGroceryItem,
} from "@/app/actions/grocery";
import { getInjection } from "@/di/container";
import { form } from "@/tests/_support/form";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

const plansOf = (userId: string) =>
  getInjection("IListMySpacesController")({ type: "meal-plan" }, userId);

async function newRecipe(userId: string): Promise<string> {
  const book = await getInjection("IEnsurePersonalSpaceController")(
    "recipe-book",
    userId,
  );
  const recipe = await getInjection("ICreateRecipeController")(
    {
      spaceId: book.id,
      data: { title: "Chili", ingredients: [{ raw: "1 lb beans" }] },
    },
    userId,
  );
  return recipe.id;
}

describe("grocery actions", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("adds a typed item and refreshes the list", async () => {
    const list = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    expect(
      await addGroceryItem(null, form({ spaceId: list.id, text: " Milk " })),
    ).toEqual({
      message: "added",
    });
    const items = await getInjection("IGetGroceryListController")(
      { spaceId: list.id },
      userId,
    );
    expect(items.map((item) => item.text)).toEqual(["Milk"]);
    expect(nextState.revalidated).toContain("/groceries");
  });

  it("checks off, removes and clears, returning nothing on success", async () => {
    const list = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    await addGroceryItem(null, form({ spaceId: list.id, text: "Milk" }));
    await addGroceryItem(null, form({ spaceId: list.id, text: "Eggs" }));
    const items = () =>
      getInjection("IGetGroceryListController")({ spaceId: list.id }, userId);
    const [milk, eggs] = await items();

    expect(await setGroceryItemChecked(milk?.id ?? "", true)).toBeNull();
    expect(await removeGroceryItem(eggs?.id ?? "")).toBeNull();
    expect((await items()).map((item) => [item.text, item.checked])).toEqual([
      ["Milk", true],
    ]);
    expect(await clearCheckedItems(list.id)).toBeNull();
    expect(await items()).toEqual([]);
  });

  it("clears the whole list, and refreshes Plan too (its count changes)", async () => {
    const list = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    await addGroceryItem(null, form({ spaceId: list.id, text: "Milk" }));
    await addGroceryItem(null, form({ spaceId: list.id, text: "Eggs" }));

    expect(await clearGroceryList(list.id)).toBeNull();
    expect(
      await getInjection("IGetGroceryListController")(
        { spaceId: list.id },
        userId,
      ),
    ).toEqual([]);
    expect(nextState.revalidated).toEqual(
      expect.arrayContaining(["/groceries", "/plan"]),
    );
  });

  it("edits an item's text, and says why a blank edit can't save", async () => {
    const list = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    await addGroceryItem(null, form({ spaceId: list.id, text: "Milk" }));
    const items = () =>
      getInjection("IGetGroceryListController")({ spaceId: list.id }, userId);
    const [milk] = await items();

    expect(await updateGroceryItem(milk?.id ?? "", " Oat milk ")).toBeNull();
    expect((await items()).map((item) => item.text)).toEqual(["Oat milk"]);
    expect(nextState.revalidated).toContain("/groceries");
    expect(await updateGroceryItem(milk?.id ?? "", " ")).toEqual({
      error: "Type something, or remove the item instead",
    });
  });

  it("reports why a tap didn't work instead of throwing", async () => {
    expect(await setGroceryItemChecked(crypto.randomUUID(), true)).toEqual({
      error: "That item is no longer in groceries",
    });
    expect(
      await addGroceryItem(
        null,
        form({ spaceId: crypto.randomUUID(), text: " " }),
      ),
    ).toEqual({
      error: "Type something to add",
    });
    nextState.userId = undefined;
    expect(await clearCheckedItems(crypto.randomUUID())).toEqual({
      error: "Your session expired. Sign in again.",
    });
  });

  it("with no plan chosen or owned, creates their own and adds to its list", async () => {
    const recipeId = await newRecipe(userId);
    const state = await addRecipeToList({ recipeId });

    expect(state).toMatchObject({ ok: true, result: { added: 1 } });
    const plans = await plansOf(userId);
    expect(plans.map((plan) => plan.name)).toEqual(["My Plan"]);
    expect(state?.ok && state.result.planId).toBe(plans[0]?.id);
  });

  it("says a recipe is already on the list, and adds it again when asked", async () => {
    const recipeId = await newRecipe(userId);
    await addRecipeToList({ recipeId });

    expect(await addRecipeToList({ recipeId })).toMatchObject({
      ok: true,
      result: { added: 0, merged: 0, alreadyAdded: 1 },
    });
    expect(await addRecipeToList({ recipeId, again: true })).toMatchObject({
      ok: true,
      result: { merged: 1, alreadyAdded: 0 },
    });
  });

  it("never picks a plan's list they can only view", async () => {
    const owner = crypto.randomUUID();
    const shared = await getInjection("ICreateSpaceController")(
      { type: "meal-plan", name: "Theirs" },
      owner,
    );
    const invite = await getInjection("ICreateInviteController")(
      { spaceId: shared.id, role: "viewer" },
      owner,
    );
    await getInjection("IAcceptInviteController")(
      { token: invite.token },
      userId,
    );
    const recipeId = await newRecipe(userId);

    expect(await addRecipeToList({ recipeId, planId: shared.id })).toEqual({
      ok: false,
      error: "You do not have access to this space",
    });

    const state = await addRecipeToList({ recipeId });
    expect(state?.ok && state.result.planId).not.toBe(shared.id);
  });

  it("adds the plan's meals, and refreshes the plan and the list", async () => {
    const plan = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    expect(await addPlanToList({ planId: plan.id })).toEqual({
      ok: true,
      result: {
        planId: plan.id,
        added: 0,
        merged: 0,
        skipped: 0,
        alreadyAdded: 0,
      },
    });
    expect(nextState.revalidated).toContain("/plan");
    expect(
      await addPlanToList({ planId: plan.id, entryId: crypto.randomUUID() }),
    ).toEqual({
      ok: false,
      error: "That meal is no longer in the meal plan",
    });
  });
});
