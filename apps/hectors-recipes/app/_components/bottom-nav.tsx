"use client";

import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
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

function isActive(pathname: string | null, match: readonly string[]): boolean {
  if (pathname === null) {
    return false;
  }
  return match.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );
}

// The prerendered page doesn't know the address of a recipe or an invite (`[id]`,
// `[token]`), so the bar starts with no tab lit and lights its tab once the address is known.
export function BottomNav() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <CurrentTabBar />
    </Suspense>
  );
}

function CurrentTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      // Stays still while a page moves (D89; app/globals.css).
      data-motion-name="tab-bar"
      className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 pb-safe border-t backdrop-blur"
    >
      <ul className="mx-auto grid h-16 max-w-3xl grid-cols-3">
        {TABS.map(({ href, label, tab, match }) => {
          const active = isActive(pathname, match);
          return (
            <li key={href}>
              <Link
                href={href}
                // D87: the library reads its book and search from the address, which the
                // plain prefetch leaves out, so the Recipes tab gets it ready in full (one
                // request). Meal plan and Groceries load fresh on every visit.
                prefetch={tab === "recipes" ? true : "auto"}
                transitionTypes={["switch-tab"]}
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
