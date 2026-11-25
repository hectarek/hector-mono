"use client";

import { cn } from "@repo/ui/lib/utils";
import { useId, useState } from "react";
import { SearchIcon } from "@/app/_components/icons";
import { Piece } from "@/app/_components/piece";
import type { PieceColor, PieceShape } from "@/src/entities/piece";

export type PickablePerson = {
  id: string;
  name: string;
  shape: PieceShape;
  color: PieceColor;
};

// Up to six people are buttons; more are a list found by typing (screens.md's limits: a circle
// of 30, and any "who" choice with more than six people is searchable).
const BUTTONS_UP_TO = 6;

// A "who" choice (record a loan's borrower, who to invite): each person by their piece and
// name. One person, or several with `multiple`. The chosen ids go with the form as `name`. Inside
// a group whose label names it already (C9), its legend is for screen readers only.
export function PeoplePicker({
  label,
  name,
  people,
  value,
  onChange,
  multiple = false,
  labelHidden = false,
}: {
  label: string;
  name: string;
  people: PickablePerson[];
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  labelHidden?: boolean;
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const searchable = people.length > BUTTONS_UP_TO;
  const wanted = search.trim().toLowerCase();
  const shown =
    searchable && wanted
      ? people.filter((person) => person.name.toLowerCase().includes(wanted))
      : people;

  const pick = (id: string) => {
    if (multiple) {
      onChange(
        value.includes(id) ? value.filter((one) => one !== id) : [...value, id],
      );
    } else {
      onChange(value.includes(id) ? [] : [id]);
    }
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend
        className={labelHidden ? "sr-only" : "mb-2 text-13 font-semibold"}
      >
        {label}
      </legend>
      {searchable && (
        // The kit's search field: the edge on a wrapper, a bare input inside, and the focus
        // ring on the wrapper.
        <div className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-3 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-foreground focus-within:outline-dashed">
          <SearchIcon />
          <label htmlFor={searchId} className="sr-only">
            Find a friend
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a friend"
            className="min-w-0 self-stretch flex-1 bg-transparent text-15 text-foreground focus-visible:outline-none"
          />
        </div>
      )}
      <div className={cn("flex gap-2", searchable ? "flex-col" : "flex-wrap")}>
        {shown.map((person) => (
          <button
            key={person.id}
            type="button"
            aria-pressed={value.includes(person.id)}
            onClick={() => pick(person.id)}
            className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-3.5 text-15 font-bold text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <Piece shape={person.shape} color={person.color} size={16} />
            {person.name}
          </button>
        ))}
        {searchable && shown.length === 0 && (
          <p className="text-13 text-muted-foreground">
            No friend called “{search.trim()}”.
          </p>
        )}
      </div>
      {value.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </fieldset>
  );
}
