import { Button } from "@repo/ui/components/button";
import { UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { DefaultBookPicker } from "@/app/_components/default-book-picker";
import { NewBookForm } from "@/app/_components/new-book-form";
import { RoleBadge } from "@/app/_components/role-badge";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadBooks } from "@/app/_lib/load-books";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const userId = await getCurrentUserId();
  const { books } = await loadBooks(userId, undefined);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/" label="Recipes" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recipe books</h1>
        <p className="text-muted-foreground text-sm">
          Share a book to cook from the same recipes. Everyone in a book sees
          the same recipes; editors can change them.
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
              <span>
                <RoleBadge role={book.role} />
              </span>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/spaces/${book.id}/settings`} />}
            >
              {book.role === "owner" ? (
                <>
                  <UserPlus data-icon="inline-start" />
                  Share
                </>
              ) : (
                <>
                  <Users data-icon="inline-start" />
                  Members
                </>
              )}
            </Button>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">New book</h2>
        <NewBookForm />
      </section>
    </div>
  );
}
