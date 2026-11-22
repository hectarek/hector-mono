"use client";

import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Sheet } from "@/app/_components/sheet";
import {
  LIBRARY_SORTS,
  type LibrarySort,
  SORT_WORDS,
} from "@/src/entities/library-filters";

// B12, Sort by: the six sorts (R12), apart from the filters. A tap applies one and closes the
// sheet, with no Done (ABF-17). Each label sits beside its radio: a Base UI control inside its own
// label flips twice on one click in happy-dom.
export function SortSheet({
  open,
  onOpenChange,
  sort,
  onSort,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sort: LibrarySort;
  onSort: (sort: LibrarySort) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Sort by">
      <RadioGroup
        aria-label="Sort by"
        value={sort}
        onValueChange={(next) => {
          const chosen = LIBRARY_SORTS.find((value) => value === next);
          if (chosen) {
            onSort(chosen);
          }
          onOpenChange(false);
        }}
      >
        {LIBRARY_SORTS.map((value) => (
          <div key={value} className="flex items-center gap-2.5">
            <RadioGroupItem id={`sort-${value}`} value={value} />
            <label
              htmlFor={`sort-${value}`}
              className="flex min-h-11 flex-1 items-center text-15"
            >
              {SORT_WORDS[value].option}
            </label>
          </div>
        ))}
      </RadioGroup>
    </Sheet>
  );
}
