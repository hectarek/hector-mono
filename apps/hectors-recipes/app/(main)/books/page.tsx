import { Button } from "@repo/ui/components/button";
import { Users } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { DefaultBookPicker } from "@/app/_components/default-book-picker";
import { JoinLinkForm } from "@/app/_components/join-link-form";
import { NewBookForm } from "@/app/_components/new-book-form";
import { RoleBadge } from "@/app/_components/role-badge";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadBooks } from "@/app/_lib/load-books";
import { getInjection } from "@/di/container";
import { recipeCountText } from "@/src/entities/library";

export default async function BooksPage() {
  const { books, counts } = await loadBookList();

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/" label="Recipes" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recipe books</h1>
        <p className="text-muted-foreground text-sm">
          Invite people from a book&apos;s Members to cook from the same
          recipes. Everyone in a book sees the same recipes; editors can change
          them.
        </p>
      </div>

      {books.length > 1 && (
        <DefaultBookPicker
          books={books}
          defaultId={books.find((book) => book.isDefault)?.id}
        />
      )}

      <ul className="flex flex-col divide-y rounded-xl border">
        {books.map((book) => (
          <li key={book.id} className="flex items-center gap-2 p-3">
            <Link
              href={`/?book=${book.id}`}
              className="flex min-w-0 flex-1 flex-col gap-1"
            >
              <span className="truncate font-medium">{book.name}</span>
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <RoleBadge role={book.role} />
                {recipeCountText(counts.get(book.id) ?? 0)}
              </span>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/spaces/${book.id}/settings`} />}
            >
              <Users data-icon="inline-start" />
              Members
            </Button>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Join someone&apos;s book</h2>
        <p className="text-muted-foreground text-sm">
          Paste the invite link they sent you. A plan&apos;s link works here
          too.
        </p>
        <JoinLinkForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">New book</h2>
        <NewBookForm />
      </section>
    </div>
  );
}

// D87: kept in the phone's memory for 5 minutes, never on the server, so Books shows at once
// when you come back to it within them. Any save clears it.
async function loadBookList() {
  "use cache: private";
  cacheLife({ stale: 300 });

  const userId = await getCurrentUserId();
  const { books } = await loadBooks(userId, undefined);
  // Each book's count (P23.2), from the same list All recipes shows.
  const { recipes } = await getInjection("IGetAllRecipesController")(
    {},
    userId,
  );
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    counts.set(recipe.spaceId, (counts.get(recipe.spaceId) ?? 0) + 1);
  }
  return { books, counts };
}
