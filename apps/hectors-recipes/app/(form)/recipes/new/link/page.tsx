import { LinkImport } from "@/app/_components/link-import";
import { loadNewRecipe } from "@/app/_lib/new-recipe";

// Add by link or text (ux-plan P10.3, D73).
export default async function NewRecipeLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  return <LinkImport {...(await loadNewRecipe(book))} />;
}
