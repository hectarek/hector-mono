import { cn } from "@repo/ui/lib/utils";
import { Users } from "lucide-react";
import Link from "next/link";

// Pills to move between the spaces of one type (books, plans) you're in. One marked `shared`
// is someone else's, shared with you, and carries a people icon (D82).
export function SpaceSwitcher({
  spaces,
  currentId,
  label,
  hrefFor,
}: {
  spaces: { id: string; name: string; shared?: boolean }[];
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
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {space.shared && <Users className="size-3.5" aria-hidden />}
            {space.name}
            {space.shared && <span className="sr-only">, shared with you</span>}
          </Link>
        );
      })}
    </nav>
  );
}
