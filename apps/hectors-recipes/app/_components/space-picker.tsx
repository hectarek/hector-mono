"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { useId } from "react";

// Which plan (or whose list) to add to; hidden when there's no choice to make.
export function SpacePicker({
  label,
  spaces,
  value,
  onChange,
}: {
  label: string;
  spaces: { id: string; name: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const id = useId();
  if (spaces.length < 2) return null;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id}>{label}</label>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {spaces.map((space) => (
          <NativeSelectOption key={space.id} value={space.id}>
            {space.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
