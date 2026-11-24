import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { BackLink } from "@/app/_components/back-link";
import { Bell } from "@/app/_components/bell";
import { Piece } from "@/app/_components/piece";
import { TabBar } from "@/app/_components/tab-bar";
import { getAccount } from "@/app/_lib/account";
import { getShellCounts } from "@/app/_lib/shell-counts";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

// The member's own piece, which opens You (profile, notices, admin). Until the profile is read, or
// when there's none to show, it's a bone pawn.
function YouLink({
  piece = { shape: "pawn", color: "bone" },
}: {
  piece?: { shape: PieceShape; color: PieceColor };
}) {
  return (
    <Link
      href="/you"
      transitionTypes={["go-deeper"]}
      aria-label="You"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-secondary"
    >
      <Piece shape={piece.shape} color={piece.color} size={16} />
    </Link>
  );
}

// The bell with its count of unread lines (U11) and the member's own piece, read once a request
// (getAccount, getShellCounts) after the page has waited on connection(), so a prerender or a
// prefetch stops here with an uncounted bell and a bone pawn. One async part per header, as a
// screen test's render waits on each.
export async function MemberTools({ on }: { on: "kraft" | "chipboard" }) {
  await connection();
  const account = await getAccount();
  const counts = account?.state === "ready" ? await getShellCounts() : null;
  return (
    <>
      <Bell on={on} unread={counts?.unread ?? 0} />
      <YouLink
        piece={
          account?.state === "ready"
            ? { shape: account.me.pieceShape, color: account.me.pieceColor }
            : undefined
        }
      />
    </>
  );
}

function MemberToolsSlot({ on }: { on: "kraft" | "chipboard" }) {
  return (
    <Suspense
      fallback={
        <>
          <Bell on={on} />
          <YouLink />
        </>
      }
    >
      <MemberTools on={on} />
    </Suspense>
  );
}

// The tabs with their counts (U11), read once a request after the page has waited on
// connection(); a prerender or a prefetch shows them uncounted.
async function CountedTabBar({
  placement,
}: {
  placement: "bottom" | "header";
}) {
  await connection();
  const counts = await getShellCounts();
  return (
    <TabBar
      placement={placement}
      counts={
        counts
          ? {
              loans: counts.loans,
              nights: counts.nights,
              friends: counts.friends,
            }
          : {}
      }
    />
  );
}

export function ShellTabBar({ placement }: { placement: "bottom" | "header" }) {
  return (
    <Suspense fallback={<TabBar placement={placement} />}>
      <CountedTabBar placement={placement} />
    </Suspense>
  );
}

// The top of the signed-in app from 768px (KTD14, Wide1 and Wide4): a chipboard bar with the
// app's name, the four tabs, the bell and the member's piece, as wide as a browsed page. The
// name is "Game Library" on a tablet and in full from 1100px, where it fits. It stays still as a
// page moves (U26).
export function AppBar() {
  return (
    <header
      data-motion-name="app-bar"
      className="sticky top-0 z-30 hidden border-b-2 border-foreground bg-card px-6 md:block"
    >
      <div className="mx-auto flex max-w-270 items-center gap-2.5 py-2">
        <p className="font-heading text-xl leading-none font-bold whitespace-nowrap uppercase">
          <span className="hidden min-[68.75rem]:inline">Community </span>
          Game Library
        </p>
        <ShellTabBar placement="header" />
        <MemberToolsSlot on="chipboard" />
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
        <MemberToolsSlot on="kraft" />
      </div>
    </header>
  );
}
