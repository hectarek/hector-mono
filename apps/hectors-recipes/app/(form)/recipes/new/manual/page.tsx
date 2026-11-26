import { FreshEachVisit } from "@/app/_components/fresh-each-visit";
import { ReadyMark } from "@/app/_components/ready-mark";
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
      <ReadyMark />
      <RecipeForm mode="create" {...form} />
    </FreshEachVisit>
  );
}
