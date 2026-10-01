"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { Check, Plus } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { addTags, tagChoices, toggleTag } from "@/app/_lib/tag-choices";

// The recipe form's tags (docs/ux-plan.md D33): the book's tags and the recipe's own as chips,
// and New tag for one that isn't there. The form holds `newTag` (null while the box is closed)
// so a tag typed but not yet added still saves.
export function TagPicker({
  suggested,
  chosen,
  onChosenChange,
  newTag,
  onNewTagChange,
}: {
  suggested: string[];
  chosen: string[];
  onChosenChange: (tags: string[]) => void;
  newTag: string | null;
  onNewTagChange: (text: string | null) => void;
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
    onChosenChange(addTags(chosen, newTag ?? ""));
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

  return (
    <div className="flex flex-wrap gap-2">
      {tagChoices(suggested, chosen).map((tag) => {
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
      })}
      {isAdding ? (
        <div className="flex w-full gap-2">
          <Input
            ref={inputRef}
            value={newTag}
            onChange={(event) => onNewTagChange(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="New tag"
            placeholder="New tag"
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <Button type="button" variant="secondary" size="lg" onClick={add}>
            Add
          </Button>
        </div>
      ) : (
        <button
          ref={newTagRef}
          type="button"
          onClick={() => onNewTagChange("")}
          className="text-muted-foreground hover:bg-muted flex h-9 items-center gap-1 rounded-full border border-dashed px-3 text-sm font-medium transition-colors"
        >
          <Plus className="size-3.5" aria-hidden />
          New tag
        </button>
      )}
    </div>
  );
}
