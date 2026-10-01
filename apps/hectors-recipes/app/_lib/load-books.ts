import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import {
  pickDefaultSpace,
  type SpaceWithRole,
} from "@/src/entities/models/space.model";

// ?book= for every book at once ("All recipes" in the library).
export const ALL_RECIPES = "all";

// The books this user is in, and the one to show: ?book= if they're a member, else the
// default, where a book shared with them beats their own (the same rule as plans).
// Everyone keeps a personal book, as the place for recipes of their own.
export async function loadBooks(
  userId: string | undefined,
  requestedId: string | undefined,
): Promise<{ books: SpaceWithRole[]; current: SpaceWithRole }> {
  await getInjection("IEnsurePersonalSpaceController")("recipe-book", userId);
  const books = await getInjection("IListMySpacesController")(
    { type: "recipe-book" },
    userId,
  );

  const current = requestedId
    ? books.find((book) => book.id === requestedId)
    : pickDefaultSpace(books);
  if (!current) {
    notFound();
  }
  return { books, current };
}
