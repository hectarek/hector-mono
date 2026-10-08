import { FreshEachVisit } from "@/app/_components/fresh-each-visit";
import { RecipeForm } from "@/app/_components/recipe-form";
import { loadNewRecipe } from "@/app/_lib/new-recipe";

// Add manually (ux-plan P10.1): the form, empty.
export default async function NewRecipeManualPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  const { form } = await loadNewRecipe(book);
  return (
    <FreshEachVisit>
      <RecipeForm mode="create" {...form} />
    </FreshEachVisit>
  );
}
