import { FreshEachVisit } from "@/app/_components/fresh-each-visit";
import { PhotoImport } from "@/app/_components/photo-import";
import { ReadyMark } from "@/app/_components/ready-mark";
import { loadNewRecipe } from "@/app/_lib/new-recipe";

// Add by photo (ux-plan P10.2) or file (D53).
export default async function NewRecipePhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  return (
    <FreshEachVisit>
      <ReadyMark />
      <PhotoImport {...(await loadNewRecipe(book))} />
    </FreshEachVisit>
  );
}
