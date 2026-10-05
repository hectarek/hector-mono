"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { cn } from "@repo/ui/lib/utils";
import { Check, Plus } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import {
  groupTagChoices,
  type NewTag,
  tagChoices,
  toggleTag,
  withNewTag,
} from "@/app/_lib/tag-choices";
import {
  isTagCategory,
  TAG_CATEGORIES,
  TAG_CATEGORY_LABELS,
  type TagGroups,
} from "@/src/entities/models/tag.model";

// The recipe form's tags (docs/ux-plan.md D33): the book's tags and the recipe's own as chips,
// under their groups (D55), and New tag for one that isn't there, with a group to give it. The
// form holds `newTag` (null while the box is closed) so a tag typed but not yet added still
// saves, and `groups`, the catalog's plus any given here.
export function TagPicker({
  suggested,
  chosen,
  onChosenChange,
  groups,
  onGroupsChange,
  newTag,
  onNewTagChange,
}: {
  suggested: string[];
  chosen: string[];
  onChosenChange: (tags: string[]) => void;
  groups: TagGroups;
  onGroupsChange: (groups: TagGroups) => void;
  newTag: NewTag | null;
  onNewTagChange: (newTag: NewTag | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const newTagRef = useRef<HTMLButtonElement>(null);
  // Set when the box closes, so the cursor goes back to New tag rather than nowhere.
  const returnFocus = useRef(false);
  const isAdding = newTag !== null;

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      newTagRef.current?.focus();
    }
  }, [isAdding]);

  function close() {
    returnFocus.current = true;
    onNewTagChange(null);
  }

  function add() {
    const next = withNewTag(chosen, groups, newTag);
    onGroupsChange(next.groups);
    onChosenChange(next.chosen);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the tag rather than saving the recipe, but not the Return that confirms an
    // IME's text (Safari sends it as keyCode 229 after compositionend).
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    } else if (event.key === "Escape") {
      close();
    }
  }

  function chip(tag: string) {
    const isChosen = chosen.includes(tag);
    return (
      <button
        key={tag}
        type="button"
        aria-pressed={isChosen}
        onClick={() => onChosenChange(toggleTag(chosen, tag))}
        className={cn(
          "flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
          isChosen
            ? "bg-secondary text-secondary-foreground border-transparent"
            : "hover:bg-muted",
        )}
      >
        {isChosen && <Check className="size-3.5" aria-hidden />}
        {tag}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groupTagChoices(tagChoices(suggested, chosen), groups).map(
        ({ category, tags }) => (
          <fieldset key={category ?? "other"}>
            <legend className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
              {category ? TAG_CATEGORY_LABELS[category] : "Other"}
            </legend>
            <div className="flex flex-wrap gap-2">{tags.map(chip)}</div>
          </fieldset>
        ),
      )}
      {isAdding ? (
        <div className="flex w-full flex-wrap gap-2">
          <Input
            ref={inputRef}
            value={newTag.text}
            onChange={(event) =>
              onNewTagChange({ ...newTag, text: event.target.value })
            }
            onKeyDown={onKeyDown}
            aria-label="New tag"
            placeholder="New tag"
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <NativeSelect
            aria-label="New tag's group"
            value={newTag.group ?? ""}
            onChange={(event) => {
              const group = event.target.value;
              onNewTagChange({
                ...newTag,
                group: isTagCategory(group) ? group : undefined,
              });
            }}
          >
            <NativeSelectOption value="">No group</NativeSelectOption>
            {TAG_CATEGORIES.map((category) => (
              <NativeSelectOption key={category} value={category}>
                {TAG_CATEGORY_LABELS[category]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="button" variant="secondary" size="lg" onClick={add}>
            Add
          </Button>
        </div>
      ) : (
        <button
          ref={newTagRef}
          type="button"
          onClick={() => onNewTagChange({ text: "", group: undefined })}
          className="text-muted-foreground hover:bg-muted flex h-9 w-fit items-center gap-1 rounded-full border border-dashed px-3 text-sm font-medium transition-colors"
        >
          <Plus className="size-3.5" aria-hidden />
          New tag
        </button>
      )}
    </div>
  );
}
