import { AddToListButton } from "@/app/_components/add-to-list-button";
import { CookMode } from "@/app/_components/cook-mode";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { type SearchParams, servingsParam } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { editableSpaces } from "@/src/entities/models/space.model";

export default async function CookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  // From the recipe page's Cook link, when its servings were changed.
  const initialServings = servingsParam((await searchParams).servings);
  const { recipe } = await loadRecipe(id);
  // Whose grocery list: a plan's list is part of the plan.
  const plans = await getInjection("IListMySpacesController")(
    { type: "meal-plan" },
    await getCurrentUserId(),
  );
  const planTargets = editableSpaces(plans);
  const canList = planTargets.length > 0 || plans.length === 0;

  return (
    <article className="flex flex-1 flex-col">
      <CookMode
        recipeId={recipe.id}
        title={recipe.title}
        recipeHref={`/recipes/${recipe.id}`}
        lines={recipe.ingredients}
        yieldServings={recipe.yieldServings}
        initialServings={initialServings}
        steps={recipe.steps}
        addToList={
          canList ? (
            <AddToListButton
              recipeId={recipe.id}
              title={recipe.title}
              yieldServings={recipe.yieldServings}
              plans={planTargets}
            />
          ) : null
        }
      />
    </article>
  );
}
