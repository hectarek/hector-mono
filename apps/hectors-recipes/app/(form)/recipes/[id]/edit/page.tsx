import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { FreshEachVisit } from "@/app/_components/fresh-each-visit";
import { RecipeForm } from "@/app/_components/recipe-form";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { suggestedTags } from "@/app/_lib/tag-choices";
import { getInjection } from "@/di/container";
import { rowsFromLines, stepRowsFrom } from "@/src/entities/editor-rows";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { recipe, canEdit } = await loadRecipe(id);

  if (!canEdit) {
    return (
      <Empty className="my-8">
        <EmptyHeader>
          <EmptyTitle>You can view this recipe but not edit it</EmptyTitle>
          <EmptyDescription>
            Only editors of the book it belongs to can change it.
          </EmptyDescription>
        </EmptyHeader>
        {/* This layout has no header or tab bar, so the way back is here. */}
        <EmptyContent>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={`/recipes/${recipe.id}`} />}
          >
            Back to the recipe
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // Tags from every book they're in, most-used first, as on New: the chips are the only way
  // to pick one, so a household's books share one set (D33).
  const { tags, tagGroups } = await getInjection("IGetAllRecipesController")(
    {},
    await getCurrentUserId(),
  );

  // A fresh visit shows the recipe as saved; Back brings back what was being typed.
  return (
    <FreshEachVisit>
      <RecipeForm
        mode="edit"
        heading="Edit recipe"
        suggestedTags={suggestedTags(tags)}
        tagGroups={tagGroups}
        recipeId={recipe.id}
        values={{
          title: recipe.title,
          description: recipe.description ?? "",
          ingredients: rowsFromLines(recipe.ingredients),
          steps: stepRowsFrom(recipe.steps),
          yieldServings: recipe.yieldServings?.toString() ?? "",
          timeMinutes: recipe.timeMinutes?.toString() ?? "",
          tags: recipe.tags,
          sourceUrl: recipe.sourceUrl ?? "",
          imageUrl: recipe.imageUrl ?? "",
          videoUrl: recipe.videoUrl ?? "",
        }}
      />
    </FreshEachVisit>
  );
}
