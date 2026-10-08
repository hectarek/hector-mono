import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadBooks } from "@/app/_lib/load-books";
import { suggestedTags } from "@/app/_lib/tag-choices";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";

// What each way of adding a recipe (manually, by photo or file, by link) gives the new-recipe form:
// the book it goes in (the one it was started from, or from All recipes their own), the books
// they can pick instead, the tag chips, and where Cancel goes.
export async function loadNewRecipe(requested: string | undefined) {
  const userId = await getCurrentUserId();
  const { books } = await loadBooks(userId, undefined);
  const editable = books
    .filter((book) => hasRole(book.role, "editor"))
    .map(({ id, name, role }) => ({ id, name, role }));
  const book = requested
    ? editable.find((candidate) => candidate.id === requested)
    : editable.find((candidate) => candidate.role === "owner");
  if (!book) {
    notFound();
  }

  // Tags from every book they're in, so a household's books share one vocabulary.
  const { tags, tagGroups } = await getInjection("IGetAllRecipesController")(
    {},
    userId,
  );
  const query = requested ? `?book=${encodeURIComponent(requested)}` : "";

  return {
    form: {
      spaceId: book.id,
      books: editable,
      cancelHref: requested ? `/?book=${requested}` : "/",
      suggestedTags: suggestedTags(tags),
      tagGroups,
      heading: "New recipe",
      note: editable.length > 1 ? undefined : `Saving to ${book.name}`,
    },
    // For the photo and link pages: the way back to the choice, and the way on when a read fails.
    choiceHref: `/recipes/new${query}`,
    manualHref: `/recipes/new/manual${query}`,
    photoHref: `/recipes/new/photo${query}`,
  };
}
