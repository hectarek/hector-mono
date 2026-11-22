"use client";

import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import {
  CalendarIcon,
  FriendsIcon,
  LibraryIcon,
  LoansIcon,
} from "@/app/_components/icons";
import { TabCount } from "@/app/_components/tab-count";
import { confirmLeave } from "@/app/_lib/leave-guard";

export type TabCounts = Partial<Record<Tab, number>>;

type Tab = "library" | "nights" | "loans" | "friends";

// The four tabs, in their order (D14). Each owns the pages under it, so a pushed page keeps its
// tab lit; You, the inbox and the admin's pages light none.
const TABS: {
  tab: Tab;
  href: string;
  label: string;
  icon: ReactNode;
  pages: string[];
}[] = [
  {
    tab: "library",
    href: "/",
    label: "Library",
    icon: <LibraryIcon />,
    pages: ["/my-library", "/games", "/copies"],
  },
  {
    tab: "nights",
    href: "/nights",
    label: "Nights",
    icon: <CalendarIcon />,
    pages: ["/nights"],
  },
  {
    tab: "loans",
    href: "/loans",
    label: "Loans",
    icon: <LoansIcon />,
    pages: ["/loans"],
  },
  {
    tab: "friends",
    href: "/friends",
    label: "Friends",
    icon: <FriendsIcon />,
    pages: ["/friends"],
  },
];

function isUnder(pathname: string, page: string): boolean {
  return pathname === page || pathname.startsWith(`${page}/`);
}

export function currentTab(pathname: string | null): Tab | undefined {
  if (pathname === null) return undefined;
  if (pathname === "/") return "library";
  return TABS.find(({ pages }) => pages.some((page) => isUnder(pathname, page)))
    ?.tab;
}

// The bar of four tabs (the design system's TabBar): a line icon over a stencil label, the
// current tab's icon on a navy pill, and a red count where something waits on the member (U11
// gives the counts). On a phone it's the bar at the bottom; from 768px the same tabs sit in the
// header, and the bottom bar goes (KTD14). The prerendered page doesn't know a pushed page's
// address, so the bar starts with no tab lit and lights its tab once it does.
export function TabBar({
  placement,
  counts = {},
}: {
  placement: "bottom" | "header";
  counts?: TabCounts;
}) {
  return (
    <Suspense
      fallback={
        <Tabs placement={placement} counts={counts} current={undefined} />
      }
    >
      <CurrentTabs placement={placement} counts={counts} />
    </Suspense>
  );
}

function CurrentTabs({
  placement,
  counts,
}: {
  placement: "bottom" | "header";
  counts: TabCounts;
}) {
  return (
    <Tabs
      placement={placement}
      counts={counts}
      current={currentTab(usePathname())}
    />
  );
}

function Tabs({
  placement,
  counts,
  current,
}: {
  placement: "bottom" | "header";
  counts: TabCounts;
  current: Tab | undefined;
}) {
  const router = useRouter();
  return (
    <nav
      aria-label="Main"
      className={cn(
        placement === "bottom" &&
          "sticky bottom-0 z-30 border-t-2 border-foreground bg-card pb-safe md:hidden",
        placement === "header" && "mr-auto ml-3.5 shrink-0",
      )}
    >
      <ul
        className={cn(
          "grid grid-cols-4",
          placement === "bottom" && "px-1.5 pt-1 pb-2.5",
          placement === "header" && "w-80",
        )}
      >
        {TABS.map(({ tab, href, label, icon }) => {
          const count = counts[tab] ?? 0;
          const isCurrent = tab === current;
          return (
            <li key={tab}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={
                  count > 0 ? `${label}, ${count} waiting` : undefined
                }
                onClick={(event) =>
                  confirmLeave(event, () => router.push(href))
                }
                className="flex min-h-13 flex-col items-center gap-0.75 pt-1 font-heading text-2xs font-bold tracking-wide text-foreground uppercase hover:text-destructive"
              >
                <span
                  className={cn(
                    "grid h-7 w-13 place-items-center rounded-full *:col-start-1 *:row-start-1",
                    isCurrent && "bg-primary text-primary-foreground",
                  )}
                >
                  {icon}
                  <TabCount count={count} on="tab" />
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
