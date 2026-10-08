"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { cn } from "@repo/ui/lib/utils";
import { Bookmark, Check, Search } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { libraryHref } from "@/app/_lib/library-href";
import type { LibraryOrder } from "@/src/entities/library";
import {
  TAG_CATEGORIES,
  TAG_CATEGORY_LABELS,
  type TagCategory,
} from "@/src/entities/models/tag.model";

const ORDER_LABELS: Record<LibraryOrder, string> = {
  saved: "Saved first",
  recent: "Recently viewed",
  az: "A to Z",
};

// The search box, Sort and group (D80), the Saved chip and the tag chips. Still a plain GET
// form and links, so searching, tags and grouping work before the page's script has loaded and
// every view has its own address; with the script, the list narrows as you type and reorders
// or regroups as you pick (LibraryResults). The orders need the script: Recently viewed is
// kept on the device (D76).
export function LibraryFilters({
  book,
  tags,
  activeTag,
  search,
  onSearch,
  order,
  group,
  onArrange,
  savedOnly,
  showSaved,
}: {
  book: string | undefined;
  tags: string[];
  activeTag: string | undefined;
  search: string;
  onSearch: (text: string) => void;
  order: LibraryOrder;
  group: TagCategory | undefined;
  onArrange: (value: string) => void;
  // Only saved recipes are shown (?saved=1).
  savedOnly: boolean;
  // There's anything saved to show the Saved chip for.
  showSaved: boolean;
}) {
  // The list already shows the results, so Enter just closes the phone's keyboard.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.querySelector("input")?.blur();
  }

  // Where a chip goes: everything as it is, with the chip's own filter flipped.
  const sort = order === "saved" ? undefined : order;
  const href = (filters: { tag?: string; saved: boolean }) =>
    libraryHref({
      book,
      search: search.trim() || undefined,
      sort,
      group,
      ...filters,
    });

  return (
    <div className="flex flex-col gap-3">
      <search>
        <form action="/" onSubmit={submit} className="flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupInput
              type="search"
              name="q"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              // Short: beside Sort and group, a longer one is cut off at 375 px.
              placeholder="Search"
              aria-label="Search recipes"
            />
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
          </InputGroup>
          {/* Named "group": without the script, a grouping still travels with a search. */}
          <NativeSelect
            name="group"
            aria-label="Sort and group"
            value={group ?? order}
            onChange={(event) => onArrange(event.target.value)}
          >
            <NativeSelectOptGroup label="Sort">
              {(Object.keys(ORDER_LABELS) as LibraryOrder[]).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {ORDER_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Group">
              {TAG_CATEGORIES.map((category) => (
                <NativeSelectOption key={category} value={category}>
                  By {TAG_CATEGORY_LABELS[category].toLowerCase()}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
          {book && <input type="hidden" name="book" value={book} />}
          {activeTag && <input type="hidden" name="tag" value={activeTag} />}
          {savedOnly && <input type="hidden" name="saved" value="1" />}
        </form>
      </search>

      {(tags.length > 0 || showSaved) && (
        <div className="-mx-4 flex gap-2 no-scrollbar overflow-x-auto px-4 pb-1">
          {showSaved && (
            <Chip
              href={href({ tag: activeTag, saved: !savedOnly })}
              active={savedOnly}
            >
              <Bookmark className="size-3.5" aria-hidden />
              Saved
            </Chip>
          )}
          {tags.map((tag) => (
            <Chip
              key={tag}
              href={href({
                tag: tag === activeTag ? undefined : tag,
                saved: savedOnly,
              })}
              active={tag === activeTag}
            >
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-secondary-foreground border-transparent"
          : "hover:bg-muted",
      )}
    >
      {active && <Check className="size-3.5" aria-hidden />}
      {children}
    </Link>
  );
}
