import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/app/_components/back-link";
import { Bell } from "@/app/_components/bell";
import { Piece } from "@/app/_components/piece";
import { TabBar } from "@/app/_components/tab-bar";

// The member's own piece, which opens You (profile, notices, admin). U5 reads the member's
// piece; until then it's a bone pawn.
function YouButton() {
  return (
    <Link
      href="/you"
      aria-label="You"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-secondary"
    >
      <Piece shape="pawn" color="bone" size={16} />
    </Link>
  );
}

// The top of the signed-in app from 768px (KTD14, Wide1 and Wide4): a chipboard bar with the
// app's name, the four tabs, the bell and the member's piece, as wide as a browsed page. The
// name is "Game Library" on a tablet and in full from 1100px, where it fits.
export function AppBar() {
  return (
    <header className="sticky top-0 z-30 hidden border-b-2 border-foreground bg-card px-6 md:block">
      <div className="mx-auto flex max-w-270 items-center gap-2.5 py-2">
        <p className="font-heading text-xl leading-none font-bold whitespace-nowrap uppercase">
          <span className="hidden min-[68.75rem]:inline">Community </span>
          Game Library
        </p>
        <TabBar placement="header" />
        <Bell on="chipboard" />
        <YouButton />
      </div>
    </header>
  );
}

// A page's own header (the design system's Header). A tab's first screen has its stencil
// title, at most one labelled action ("Record a loan", "New night"), and on a phone the bell
// and the piece, which from 768px are in the bar above. A pushed page has the back link, named
// for the page that opened it, and its own title in its body (sans 24px). Every state of a
// tab's first screen keeps the same header.
export function AppHeader(
  props:
    | { title: string; action?: ReactNode }
    | { back: { href: string; label: string } },
) {
  if ("back" in props) {
    return (
      <header className="-ml-2.5 flex py-3">
        <BackLink href={props.back.href} label={props.back.label} />
      </header>
    );
  }
  return (
    <header className="flex items-center gap-2.5 pt-4 pb-2.5 md:pt-6 md:pb-4">
      <h1 className="flex-1 font-heading text-3xl leading-none font-bold uppercase">
        {props.title}
      </h1>
      {props.action}
      <div className="flex gap-2.5 md:hidden">
        <Bell on="kraft" />
        <YouButton />
      </div>
    </header>
  );
}
