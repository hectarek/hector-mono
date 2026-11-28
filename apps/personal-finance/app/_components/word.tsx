"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import type { ReactNode } from "react";
import { WORDS, type WordSlug } from "@/src/content/words";

// A money word's first use on a page: a real link to its entry on /words, so it works before
// the page's code loads, which a tap turns into its definition in place once it has (R19).
// Popover, not Tooltip: a tooltip needs hover, and these readers are on phones. Mark a word by
// hand, once per page, and never inside a link, a button, a chart, a table header or a <label>.
// The definition opens in a portal outside the step, but its touches still reach the step's
// swipe handlers through React, so it's marked as a place a swipe can't start.
export function Word({
  slug,
  children,
}: {
  slug: WordSlug;
  children: ReactNode;
}) {
  const entry = WORDS[slug];
  const href = `/words#${slug}`;
  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={
          <a
            href={href}
            onClick={(event) => event.preventDefault()}
            className="underline decoration-dotted underline-offset-4"
          />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent data-swipe-ignore>
        <p className="font-semibold text-lg">{entry.word}</p>
        <p className="text-lg">{entry.definition}</p>
        <a href={href} className="text-base underline underline-offset-4">
          See every word
        </a>
      </PopoverContent>
    </Popover>
  );
}
