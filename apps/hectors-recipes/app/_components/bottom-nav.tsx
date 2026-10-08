"use client";

import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/app/_components/nav-icon";

const TABS = [
  {
    href: "/",
    label: "Recipes",
    tab: "recipes",
    match: ["/", "/recipes", "/books"],
  },
  { href: "/plan", label: "Meal plan", tab: "plan", match: ["/plan"] },
  {
    href: "/groceries",
    label: "Groceries",
    tab: "groceries",
    match: ["/groceries"],
  },
] as const;

function isActive(pathname: string, match: readonly string[]): boolean {
  return match.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 pb-safe border-t backdrop-blur"
    >
      <ul className="mx-auto grid h-16 max-w-3xl grid-cols-3">
        {TABS.map(({ href, label, tab, match }) => {
          const active = isActive(pathname, match);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-secondary text-secondary-foreground",
                  )}
                >
                  <NavIcon tab={tab} active={active} className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
