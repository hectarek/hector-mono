import { beforeEach, describe, expect, it } from "bun:test";
import {
  addPlanEntry,
  changeEntryDays,
  removePlanEntry,
  setEntryCooked,
} from "@/app/actions/plan";
import { getInjection } from "@/di/container";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

async function newRecipe(userId: string): Promise<string> {
  const book = await getInjection("IEnsurePersonalSpaceController")(
    "recipe-book",
    userId,
  );
  const recipe = await getInjection("ICreateRecipeController")(
    {
      spaceId: book.id,
      data: { title: "Tacos", ingredients: [{ raw: "8 tortillas" }] },
    },
    userId,
  );
  return recipe.id;
}

describe("plan actions", () => {
  let userId: string;
  let recipeId: string;

  beforeEach(async () => {
    userId = signInAsNewUser();
    recipeId = await newRecipe(userId);
  });

  const week = async (planId: string) =>
    getInjection("IGetWeekPlanController")(
      { spaceId: planId, date: "2026-09-21" },
      userId,
    );
  const plan = async () =>
    (
      await getInjection("IListMySpacesController")(
        { type: "meal-plan" },
        userId,
      )
    )[0]?.id ?? "";
  const tuesday = { cookDate: "2026-09-22", eatDates: ["2026-09-22"] };

  it("with no plan chosen (Add to plan from a recipe), uses their own", async () => {
    expect(await addPlanEntry({ recipeId, ...tuesday })).toBeNull();

    expect((await week(await plan())).map((entry) => entry.title)).toEqual([
      "Tacos",
    ]);
    expect(nextState.revalidated).toContain("/plan");
  });

  it("changes a meal's days", async () => {
    await addPlanEntry({ recipeId, ...tuesday });
    const [entry] = await week(await plan());

    expect(
      await changeEntryDays(entry?.id ?? "", {
        cookDate: "2026-09-25",
        eatDates: ["2026-09-25", "2026-09-26"],
      }),
    ).toBeNull();
    expect((await week(await plan()))[0]).toMatchObject({
      cookDate: "2026-09-25",
      eatDates: ["2026-09-25", "2026-09-26"],
    });
    expect(nextState.revalidated).toContain("/plan");
  });

  it("marks cooked and removes", async () => {
    await addPlanEntry({ recipeId, ...tuesday });
    const [entry] = await week(await plan());

    expect(await setEntryCooked(entry?.id ?? "", true)).toBeNull();
    expect((await week(await plan()))[0]?.cooked).toBe(true);
    expect(await removePlanEntry(entry?.id ?? "")).toBeNull();
    expect(await week(await plan())).toEqual([]);
  });

  it("reports problems instead of throwing", async () => {
    expect(
      await addPlanEntry({
        recipeId,
        cookDate: "2026-02-30",
        eatDates: ["2026-03-01"],
      }),
    ).toEqual({
      error: "Cook day: Pick a valid date",
      fields: { cookDate: "Pick a valid date" },
    });
    expect(
      await addPlanEntry({
        recipeId,
        cookDate: "2026-09-22",
        eatDates: ["2026-09-21"],
      }),
    ).toEqual({
      error: "Eat days: A meal can't be eaten before it's cooked",
      fields: { eatDates: "A meal can't be eaten before it's cooked" },
    });
    expect(await setEntryCooked(crypto.randomUUID(), true)).toEqual({
      error: "That meal is no longer in the meal plan",
    });
    nextState.userId = undefined;
    expect(await removePlanEntry(crypto.randomUUID())).toEqual({
      error: "Your session expired. Sign in again.",
    });
  });
});
