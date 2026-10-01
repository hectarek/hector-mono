import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";

// Pills to move between the spaces of one type (books, plans) you're in.
export function SpaceSwitcher({
  spaces,
  currentId,
  label,
  hrefFor,
}: {
  spaces: { id: string; name: string }[];
  currentId: string;
  label: string;
  hrefFor: (id: string) => string;
}) {
  if (spaces.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-2 no-scrollbar overflow-x-auto px-4"
    >
      {spaces.map((space) => {
        const active = space.id === currentId;
        return (
          <Link
            key={space.id}
            href={hrefFor(space.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {space.name}
          </Link>
        );
      })}
    </nav>
  );
}
