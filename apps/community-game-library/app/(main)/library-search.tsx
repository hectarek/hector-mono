"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CloseIcon, SearchIcon } from "@/app/_components/icons";

// How long typing pauses before the results follow it.
const SETTLE_MS = 250;

// The Library's search (R2, B10): the kit's search field, as the people picker draws it, with
// Clear the search once something's typed. The results narrow as you type: each pause replaces
// ?q= in the address, and the page reads it, in a transition, so what's on screen stays until
// the new results arrive.
export function LibrarySearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [, startTransition] = useTransition();
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);

  function search(value: string) {
    setText(value);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      startTransition(() => {
        router.replace(
          value.trim() === "" ? "/" : `/?q=${encodeURIComponent(value)}`,
          { scroll: false },
        );
      });
    }, SETTLE_MS);
  }

  return (
    <search className="flex flex-col gap-1.5">
      <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary pl-3 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-foreground focus-within:outline-dashed">
        <SearchIcon />
        <input
          type="search"
          aria-label="Search games"
          placeholder="Search games"
          value={text}
          onChange={(event) => search(event.target.value)}
          className="h-9 min-w-0 flex-1 bg-transparent text-15 text-foreground placeholder:text-muted-foreground focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text !== "" && (
          <button
            type="button"
            aria-label="Clear the search"
            onClick={() => search("")}
            className="-m-0.5 flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {text.trim() !== "" && (
        <p className="text-xs text-muted-foreground">
          Searching your friends’ games and the catalog.
        </p>
      )}
    </search>
  );
}
