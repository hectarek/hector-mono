import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { BulkCopyForm } from "@/app/_components/bulk-copy-form";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { loadBooks } from "@/app/_lib/load-books";
import { getInjection } from "@/di/container";
import { hasRole } from "@/src/entities/models/space.model";

// Copying a whole book (or part of one) into another is how two books get merged.
export default async function CopyRecipesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const { books, current: source } = await loadBooks(userId, id);
  const { recipes } = await getInjection("IGetRecipesController")(
    { spaceId: source.id },
    userId,
  );
  const targets = books.filter(
    (book) => book.id !== source.id && hasRole(book.role, "editor"),
  );

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/?book=${source.id}`} label={source.name} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Copy recipes</h1>
        <p className="text-muted-foreground text-sm">
          From {source.name}. Copies are independent: editing one doesn&apos;t
          change the other.
        </p>
      </div>

      {targets.length === 0 ? (
        <Empty className="my-5">
          <EmptyHeader>
            <EmptyTitle>No book to copy into</EmptyTitle>
            <EmptyDescription>
              You need another book you can edit. Create one first.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/books" />}
            >
              Go to books
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <BulkCopyForm
          recipes={recipes.map(({ id: recipeId, title }) => ({
            id: recipeId,
            title,
          }))}
          targets={targets.map(({ id: bookId, name }) => ({
            id: bookId,
            name,
          }))}
        />
      )}
    </div>
  );
}
