"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { cn } from "@repo/ui/lib/utils";
import { Check, Search } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { libraryHref } from "@/app/_lib/library-href";
import {
  TAG_CATEGORIES,
  TAG_CATEGORY_LABELS,
  type TagCategory,
} from "@/src/entities/models/tag.model";

// The search box, Group by and the tag chips. Still a plain GET form and links, so filtering
// works before the page's script has loaded and every view has its own address; with the
// script, the list narrows as you type and regroups as you pick (LibraryResults).
export function LibraryFilters({
  book,
  tags,
  activeTag,
  search,
  onSearch,
  group,
  onGroup,
}: {
  book: string | undefined;
  tags: string[];
  activeTag: string | undefined;
  search: string;
  onSearch: (text: string) => void;
  group: TagCategory | undefined;
  onGroup: (group: string) => void;
}) {
  // The list already shows the results, so Enter just closes the phone's keyboard.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.querySelector("input")?.blur();
  }

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
              placeholder="Search recipes"
              aria-label="Search recipes"
            />
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
          </InputGroup>
          <NativeSelect
            name="group"
            aria-label="Group by"
            value={group ?? ""}
            onChange={(event) => onGroup(event.target.value)}
          >
            <NativeSelectOption value="">Not grouped</NativeSelectOption>
            {TAG_CATEGORIES.map((category) => (
              <NativeSelectOption key={category} value={category}>
                By {TAG_CATEGORY_LABELS[category].toLowerCase()}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {book && <input type="hidden" name="book" value={book} />}
          {activeTag && <input type="hidden" name="tag" value={activeTag} />}
        </form>
      </search>

      {tags.length > 0 && (
        <div className="-mx-4 flex gap-2 no-scrollbar overflow-x-auto px-4 pb-1">
          {tags.map((tag) => {
            const active = tag === activeTag;
            return (
              <Link
                key={tag}
                href={libraryHref({
                  book,
                  search: search.trim() || undefined,
                  tag: active ? undefined : tag,
                  group,
                })}
                aria-pressed={active}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground border-transparent"
                    : "hover:bg-muted",
                )}
              >
                {active && <Check className="size-3.5" aria-hidden />}
                {tag}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
