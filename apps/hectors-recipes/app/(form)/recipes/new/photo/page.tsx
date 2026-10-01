import { PhotoImport } from "@/app/_components/photo-import";
import { loadNewRecipe } from "@/app/_lib/new-recipe";

export const dynamic = "force-dynamic";

// Add by photo (ux-plan P10.2).
export default async function NewRecipePhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  return <PhotoImport {...(await loadNewRecipe(book))} />;
}
