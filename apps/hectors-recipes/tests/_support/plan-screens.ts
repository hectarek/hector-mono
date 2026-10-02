import { addPlanEntry } from "@/app/actions/plan";
import { getInjection } from "@/di/container";
import type { MealDays } from "@/src/entities/meal-days";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { signInAsNewUser } from "@/tests/_support/next";

// For the plan's screen tests: someone signed in with their own plan and a recipe, Chili (one
// line, so the list is easy to read), going through the real controllers and actions.
export async function planScreenFixture() {
  const userId = signInAsNewUser();
  const book = await getInjection("IEnsurePersonalSpaceController")(
    "recipe-book",
    userId,
  );
  const recipe = await getInjection("ICreateRecipeController")(
    {
      spaceId: book.id,
      data: { title: "Chili", ingredients: [{ raw: "1 lb ground turkey" }] },
    },
    userId,
  );
  const plan = await getInjection("IEnsurePersonalSpaceController")(
    "meal-plan",
    userId,
  );

  // The meals in the week of `date`, as Plan gets them.
  const meals = (date: string): Promise<PlanEntry[]> =>
    getInjection("IGetWeekPlanController")({ spaceId: plan.id, date }, userId);

  return {
    userId,
    planId: plan.id,
    recipeId: recipe.id,
    meals,
    // Plans Chili on these days and gives the meal back as Plan would show it.
    async planChili(days: MealDays): Promise<PlanEntry> {
      const failed = await addPlanEntry({ recipeId: recipe.id, ...days });
      if (failed) throw new Error(failed.error);
      const meal = (await meals(days.cookDate)).find(
        (entry) =>
          entry.cookDate === days.cookDate &&
          entry.eatDates.join() === days.eatDates.join(),
      );
      if (!meal) throw new Error("The meal wasn't planned");
      return meal;
    },
    // The plan's grocery list, as text.
    async groceries(): Promise<string[]> {
      const items = await getInjection("IGetGroceryListController")(
        { spaceId: plan.id },
        userId,
      );
      return items.map((item) => item.text);
    },
  };
}
