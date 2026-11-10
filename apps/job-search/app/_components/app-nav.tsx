"use client";

import { Button } from "@repo/ui/components/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  Dumbbell,
  House,
  type LucideIcon,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { DisplayLabel } from "@/app/_components/display";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";

// A section: its menu item, the name the phone's top bar and the tab show on its pages, and for a
// section of records what a record's page and its new page are called. A section whose records
// live under another path names it: a Focus block's pages (/blocks) are the weekly review's.
type Section = {
  href: string;
  name: string;
  Icon: LucideIcon;
  record?: string;
  add?: string;
  records?: string;
};

// The app's sections, in the design system's order (its AppShell page). A unit that adds a section
// adds it here.
const SECTIONS: readonly Section[] = [
  { href: "/", name: "Today", Icon: House },
  {
    href: "/week",
    name: "Weekly review",
    Icon: CalendarCheck,
    records: "/blocks",
    record: "Block",
    add: "Add a block",
  },
  {
    href: "/jobs",
    name: "Jobs",
    Icon: Briefcase,
    record: "Job",
    add: "Add a job",
  },
  {
    href: "/companies",
    name: "Companies",
    Icon: Building2,
    record: "Company",
    add: "Add a company",
  },
  {
    href: "/people",
    name: "People",
    Icon: Users,
    record: "Person",
    add: "Add a person",
  },
  {
    href: "/practice",
    name: "Practice",
    Icon: Dumbbell,
    record: "Practice session",
    add: "Log a practice session",
  },
  { href: "/agent", name: "Claude", Icon: Bot },
  { href: "/settings", name: "Settings", Icon: Settings },
];

// Whether a path is a base path or under it.
const isUnder = (pathname: string, base: string | undefined) =>
  base !== undefined && (pathname === base || pathname.startsWith(`${base}/`));

// The section a path is in: Today only at the root, any other from its first segment down,
// or from its records' path.
function sectionOf(pathname: string) {
  return SECTIONS.find(({ href, records }) =>
    href === "/"
      ? pathname === "/"
      : isUnder(pathname, href) || isUnder(pathname, records),
  );
}

// What a page is called in its tab: its section, or what a page under it is (Add a job, Job, Edit
// job), never a record's own name, since a tab can be seen over a shoulder (the UX plan's Q9).
function pageNameOf(pathname: string): string | undefined {
  const section = sectionOf(pathname);
  const base =
    section?.records && isUnder(pathname, section.records)
      ? section.records
      : section?.href;
  const under = base ? pathname.slice(base.length) : "";
  if (!section?.record || !under) return section?.name;
  if (under === "/new") return section.add;
  if (under.endsWith("/edit")) return `Edit ${section.record.toLowerCase()}`;
  return section.record;
}

// The menu (KTD19): the sections in a nav, the current one filled in sidebar-primary for the eye
// and marked aria-current for a screen reader. Marking it takes the page's path, which a record's
// page (/jobs/[id]) only has at request time (Cache Components), so it's read under a Suspense
// boundary and the menu shows unmarked in the prerendered shell until it streams in.
export function MainNav() {
  return (
    <nav aria-label="Main">
      <Suspense fallback={<SectionMenu />}>
        <CurrentSectionMenu />
      </Suspense>
    </nav>
  );
}

function CurrentSectionMenu() {
  return <SectionMenu pathname={usePathname()} />;
}

// The sections, with the one the path is in marked: as the page on its own page, as the section a
// record's page is in. On a phone the menu is a sheet, which a tap on a section closes.
function SectionMenu({ pathname }: { pathname?: string }) {
  const current = pathname ? sectionOf(pathname)?.href : undefined;
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {SECTIONS.map(({ href, name, Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            size="lg"
            variant="primary"
            isActive={href === current}
            aria-current={
              href === current
                ? pathname === href
                  ? "page"
                  : "true"
                : undefined
            }
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
            render={<Link href={href} />}
          >
            <Icon />
            <span>{name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// The phone menu's 44 px close, as every sheet has. On a laptop the menu is no sheet, so there's
// nothing to close.
export function MenuClose() {
  const { isMobile } = useSidebar();
  return isMobile ? <SheetCloseButton /> : null;
}

// The top bar: the 44 px Menu button and, on a phone, the section's name, since the menu that
// marks it is out of sight (the design system's AppShell). The name streams in, as the menu's mark
// does.
export function TopBar() {
  const { toggleSidebar } = useSidebar();
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Menu"
        onClick={toggleSidebar}
        className="min-h-11 min-w-11"
      >
        <Menu />
      </Button>
      <Suspense>
        <SectionName />
      </Suspense>
    </>
  );
}

function SectionName() {
  return (
    <DisplayLabel className="md:hidden">
      {sectionOf(usePathname())?.name}
    </DisplayLabel>
  );
}

// The tab's title, "Jobs · Job search", so tabs and history tell pages apart and Next's route
// announcer reads each change (finding 33). The shell renders it rather than each page's metadata:
// the shell stays mounted, so React changes the title in place as the route changes. A metadata
// title is swapped for the next page's a moment after the route changes, and on a return to the
// page the tab loaded first, the announcer read in that gap and spoke the page left behind (seen
// on next start, 2026-11-07). The (main) layout's metadata sets no title, so this is the only one.
export function TabTitle() {
  return (
    <Suspense>
      <PageTitleTag />
    </Suspense>
  );
}

function PageTitleTag() {
  const page = pageNameOf(usePathname());
  return <title>{page ? `${page} · Job search` : "Job search"}</title>;
}
