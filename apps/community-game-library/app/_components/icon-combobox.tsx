"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@repo/ui/components/combobox";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { InputGroupAddon } from "@repo/ui/components/input-group";
import { type ReactNode, useState } from "react";
import { SearchIcon } from "@/app/_components/icons";

// One choice: the id the form sends, the name typing finds it by, the piece or cover drawn
// before the name, and a note after the name that typing doesn't search ("asked for it").
export type IconOption = {
  value: string;
  label: string;
  icon: ReactNode;
  note?: string;
};

function OptionWords({
  option,
  withNote = false,
}: {
  option: IconOption;
  withNote?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {option.icon}
      <span className="min-w-0">
        {option.label}
        {withNote && option.note && (
          <span className="text-13 text-muted-foreground">
            {" · "}
            {option.note}
          </span>
        )}
      </span>
    </span>
  );
}

// A friend or a game picked from a list that typing filters by name (C9's Game and Who's taking
// it, G2's It's already here). Closed, it's a field like a select's, with the chosen one's icon
// and name, or "Pick a friend". Open, a search sits above the list, each choice with its icon and
// the chosen one ticked: a tap opens it without the phone's keyboard (Base UI focuses the list on
// touch), and a click or the keyboard puts the cursor in the search. The chosen id goes with the
// form as `name`. Inside a group whose label names it already (C9), its own label is for screen
// readers only. Its look is the theme's (the kit's combobox, by data-slot).
export function IconCombobox({
  id,
  label,
  labelHidden = false,
  name,
  noun,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  labelHidden?: boolean;
  name?: string;
  // What each choice is, for the field's words: "Pick a friend", "Find a friend" and "No friend
  // called “noor”.".
  noun: "friend" | "game";
  options: IconOption[];
  // The chosen option's value, or "" for none.
  value: string;
  onChange: (value: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const chosen = options.find((option) => option.value === value) ?? null;
  const find = `Find a ${noun}`;
  return (
    <Field>
      <FieldLabel htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <Combobox
        items={options}
        value={chosen}
        onValueChange={(next) => onChange(next?.value ?? "")}
        inputValue={typed}
        onInputValueChange={setTyped}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        isItemEqualToValue={(option, current) => option.value === current.value}
        name={name}
      >
        <ComboboxTrigger id={id} className="flex items-center justify-between">
          <ComboboxValue>
            {(current: IconOption | null) =>
              current ? <OptionWords option={current} /> : `Pick a ${noun}`
            }
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent aria-label={label}>
          <ComboboxInput
            showTrigger={false}
            placeholder={find}
            aria-label={find}
          >
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </ComboboxInput>
          <ComboboxEmpty>
            No {noun} called “{typed.trim()}”.
          </ComboboxEmpty>
          <ComboboxList>
            {(option: IconOption) => (
              <ComboboxItem key={option.value} value={option}>
                <OptionWords option={option} withNote />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
