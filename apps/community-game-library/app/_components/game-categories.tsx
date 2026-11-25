"use client";

import { Button } from "@repo/ui/components/button";
import { FieldError } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Toggle } from "@repo/ui/components/toggle";
import { type ReactNode, useId, useState } from "react";

// How many chips show before More, as the owner filter folds after six (screens.md, Limits).
const SHOWN_FIRST = 6;

// What's typed in New category as categories: split at commas, each matched to one already
// listed whatever its case ("family" is Family), and each once.
function typedCategories(draft: string, listed: readonly string[]): string[] {
  const found: string[] = [];
  for (const part of draft.split(",")) {
    const typed = part.trim();
    const name =
      listed.find(
        (category) => category.toLowerCase() === typed.toLowerCase(),
      ) ?? typed;
    if (
      typed !== "" &&
      !found.some((one) => one.toLowerCase() === name.toLowerCase())
    ) {
      found.push(name);
    }
  }
  return found;
}

// G3's and G4's categories (R1; Hector, 2026-11-25): chips to tap from the categories the catalog
// already uses, the record's own first, then the most used, folded after six with More for the
// rest; and New category, for one the catalog doesn't use yet, which joins the chips tapped. The
// chips keep their places as they're tapped and after a save. The form sends what's picked, and
// anything typed in New category, as `categories` with commas between, as it sent the typed list;
// what the save says is wrong with them shows under the chips.
export function GameCategories({
  label,
  catalog,
  initial,
  error,
  onEdit,
}: {
  label: ReactNode;
  // Every category the catalog's games use, the most used first.
  catalog: string[];
  // The record's own.
  initial: string[];
  // The save's message for the field, such as a list too long to keep.
  error?: string;
  // A tap or an add, for the form's leave guard.
  onEdit: () => void;
}) {
  const newId = useId();
  const [listed, setListed] = useState(() => [
    ...initial,
    ...catalog.filter((category) => !initial.includes(category)),
  ]);
  const [picked, setPicked] = useState(initial);
  const [shownFirst] = useState(() => Math.max(SHOWN_FIRST, initial.length));
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState("");
  const open = more || listed.length <= shownFirst;
  const typed = typedCategories(draft, listed);
  const sent = [
    ...picked,
    ...typed.filter((category) => !picked.includes(category)),
  ];

  function add() {
    if (typed.length === 0) {
      return;
    }
    setListed((now) => [
      ...now,
      ...typed.filter((category) => !now.includes(category)),
    ]);
    setPicked((now) => [
      ...now,
      ...typed.filter((category) => !now.includes(category)),
    ]);
    setDraft("");
    onEdit();
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1.5 text-13 font-semibold">{label}</legend>
      <input type="hidden" name="categories" value={sent.join(", ")} />
      {listed.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(open ? listed : listed.slice(0, shownFirst)).map((category) => (
            <Toggle
              key={category}
              pressed={picked.includes(category)}
              onPressedChange={(pressed) => {
                setPicked((now) =>
                  pressed
                    ? [...now.filter((one) => one !== category), category]
                    : now.filter((one) => one !== category),
                );
                onEdit();
              }}
            >
              {category}
            </Toggle>
          ))}
          {!open && (
            <Button type="button" variant="link" onClick={() => setMore(true)}>
              More
            </Button>
          )}
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
      {open && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={newId} className="text-13 font-semibold">
            New category
          </label>
          <div className="flex gap-2">
            <Input
              id={newId}
              value={draft}
              // A chip doesn't wrap, so a longer name would run past a phone's edge.
              maxLength={30}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter adds it, rather than sending the form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={typed.length === 0}
              onClick={add}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
