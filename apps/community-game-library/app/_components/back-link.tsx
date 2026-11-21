"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackIcon } from "@/app/_components/icons";
import { confirmLeave } from "@/app/_lib/leave-guard";

// The way back from a pushed page, top left, named for the page that opened it (screens.md
// rule 11; recipes' D32): the back chevron and the page's name in stencil, one link. While a
// form on the page has typed text, it asks first (leave-guard.ts). Nothing moves between
// screens until U26 (docs/build-plan.md KTD25), so it carries no transition type yet.
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-label={`Back to ${label}`}
      onClick={(event) => confirmLeave(event, () => router.push(href))}
      className="flex min-h-11 items-center gap-1 self-start pr-2 text-foreground hover:text-destructive"
    >
      <span className="flex size-11 items-center justify-center">
        <BackIcon className="size-5.5" strokeWidth={2.4} />
      </span>
      <span className="font-heading text-lg font-bold uppercase">{label}</span>
    </Link>
  );
}
