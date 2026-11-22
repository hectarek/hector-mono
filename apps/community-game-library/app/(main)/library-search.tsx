"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CloseIcon, SearchIcon } from "@/app/_components/icons";

// How long typing pauses before the results follow it.
const SETTLE_MS = 250;

// The Library's search (R2, B10), and Add games' (B8): the kit's search field, as the people
// picker draws it, with Clear the search once something's typed. The results narrow as you type:
// each pause replaces ?q= in the page's address, and the page reads it, in a transition, so
// what's on screen stays until the new results arrive.
export function LibrarySearch({
  initial,
  path = "/",
  keep = "",
  label,
}: {
  initial: string;
  // The page whose address holds what's typed.
  path?: string;
  // The rest of the address, kept as it is ("?available=now"): the list's filters come back when
  // the search is cleared.
  keep?: string;
  // Add games' label above the field, "Search the catalog". Without one the field names itself
  // inside, and says what it searches once something's typed.
  label?: string;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [text, setText] = useState(initial);
  const [, startTransition] = useTransition();
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);

  function search(value: string) {
    setText(value);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      startTransition(() => {
        const rest = keep.replace(/^\?/, "");
        router.replace(
          value.trim() === ""
            ? `${path}${rest ? `?${rest}` : ""}`
            : `${path}?q=${encodeURIComponent(value)}${rest ? `&${rest}` : ""}`,
          { scroll: false },
        );
      });
    }, SETTLE_MS);
  }

  return (
    <search className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-13 font-semibold">
          {label}
        </label>
      )}
      <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary pl-3 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-foreground focus-within:outline-dashed">
        <SearchIcon />
        <input
          id={fieldId}
          type="search"
          aria-label={label ? undefined : "Search games"}
          placeholder={label ? undefined : "Search games"}
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
      {!label && text.trim() !== "" && (
        <p className="text-xs text-muted-foreground">
          Searching your friends’ games and the catalog.
        </p>
      )}
    </search>
  );
}
