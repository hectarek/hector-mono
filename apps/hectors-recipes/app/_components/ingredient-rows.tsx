"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Separator } from "@repo/ui/components/separator";
import { Ellipsis, Plus } from "lucide-react";
import {
  type ClipboardEvent,
  type ComponentProps,
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { RowSheet } from "@/app/_components/row-sheet";
import {
  emptyLine,
  type IngredientRow,
  isBlankLine,
  type LineRow,
  moveRow,
  newKey,
  pasteRows,
  rowRuns,
  rowsFromText,
  type SectionRow,
} from "@/src/entities/editor-rows";
import { UNITS } from "@/src/entities/ingredient-line";
import { unitLabel } from "@/src/entities/scaling";

// The rows' ⋯ buttons by key, so the cursor can go to one after a Remove.
export function useRowMenus() {
  const menus = useRef(new Map<string, HTMLButtonElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    menus.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  return {
    menuRef: (key: string) => (element: HTMLButtonElement | null) => {
      if (element) menus.current.set(key, element);
      else menus.current.delete(key);
    },
    focusMenu: setFocusKey,
  };
}

export type MenuRef = ReturnType<typeof useRowMenus>["menuRef"];

export type RowInputRef = (
  key: string,
) => (element: HTMLInputElement | HTMLTextAreaElement | null) => void;

// The recipe editor's ingredients (ux-plan P9.4): each line's amount, unit and name inline,
// its note and optional flag in its ⋯ sheet, and section rows that head the lines below them.
export function IngredientRows({
  rows,
  onChange,
  invalidKey,
  inputRef,
  focus,
}: {
  rows: IngredientRow[];
  onChange: (update: (rows: IngredientRow[]) => IngredientRow[]) => void;
  invalidKey: string | null;
  inputRef: RowInputRef;
  focus: (key: string) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { menuRef, focusMenu } = useRowMenus();
  const numbers = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === "line") numbers.set(row.key, numbers.size + 1);
  }

  // Once a field changes, the line's original text no longer describes it, so it goes; a
  // suggested aisle goes with a new name, since it was for the old one.
  function edit(key: string, fields: Partial<Omit<LineRow, "kind" | "key">>) {
    onChange((current) =>
      current.map((row) =>
        row.key === key && row.kind === "line"
          ? {
              ...row,
              ...fields,
              raw: null,
              ...("name" in fields ? { aisle: null } : {}),
            }
          : row,
      ),
    );
  }

  const sectionNumbers = new Map(
    rows
      .filter((row) => row.kind === "section")
      .map((row, index) => [row.key, index + 1]),
  );

  function retitle(key: string, title: string) {
    onChange((current) =>
      current.map((row) =>
        row.key === key && row.kind === "section" ? { ...row, title } : row,
      ),
    );
  }

  function add(row: IngredientRow) {
    onChange((current) => [...current, row]);
    focus(row.key);
  }

  // The cursor goes to the ⋯ of the row before (or else after), since the ⋯ that opened the
  // sheet goes with the row; not its text field, which would bring up the keyboard.
  function remove(key: string) {
    setOpenKey(null);
    const at = rows.findIndex((row) => row.key === key);
    const neighbour = rows[at - 1] ?? rows[at + 1];
    onChange((current) => current.filter((row) => row.key !== key));
    if (neighbour) focusMenu(neighbour.key);
  }

  function move(key: string, by: -1 | 1) {
    onChange((current) =>
      moveRow(
        current,
        current.findIndex((row) => row.key === key),
        by,
      ),
    );
  }

  function sheetFor(key: string): SheetProps {
    const index = rows.findIndex((row) => row.key === key);
    return {
      open: openKey === key,
      onOpenChange: (open) => setOpenKey(open ? key : null),
      canMoveUp: index > 0,
      canMoveDown: index < rows.length - 1,
      onMove: (by) => move(key, by),
      onRemove: () => remove(key),
    };
  }

  // A pasted list becomes rows: it fills this row if it's empty, else goes after it
  // (`pasteRows`).
  function paste(event: ClipboardEvent, row: LineRow) {
    const text = event.clipboardData.getData("text");
    const pasted = text.includes("\n") ? rowsFromText(text) : [];
    if (!pasted.length) return;
    event.preventDefault();
    onChange((current) =>
      pasteRows(
        current,
        current.findIndex((candidate) => candidate.key === row.key),
        pasted,
        isBlankLine(row),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* A section, then a list of its lines, so a screen reader counts only lines. */}
      <div className="flex flex-col gap-2">
        {rowRuns(rows).map((run) => (
          <Fragment key={run.section?.key ?? "start"}>
            {run.section && (
              <SectionItem
                row={run.section}
                number={sectionNumbers.get(run.section.key) ?? 0}
                sheet={sheetFor(run.section.key)}
                inputRef={inputRef(run.section.key)}
                menuRef={menuRef(run.section.key)}
                onRetitle={(title) =>
                  run.section && retitle(run.section.key, title)
                }
              />
            )}
            {run.rows.length > 0 && (
              <ul className="flex flex-col gap-2">
                {run.rows.map((row) => (
                  <LineItem
                    key={row.key}
                    row={row}
                    number={numbers.get(row.key) ?? 0}
                    invalid={row.key === invalidKey}
                    sheet={sheetFor(row.key)}
                    inputRef={inputRef(row.key)}
                    menuRef={menuRef(row.key)}
                    onEdit={(fields) => edit(row.key, fields)}
                    onPaste={(event) => paste(event, row)}
                  />
                ))}
              </ul>
            )}
          </Fragment>
        ))}
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => add(emptyLine())}
        >
          <Plus data-icon="inline-start" />
          Add ingredient
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => add({ kind: "section", key: newKey(), title: "" })}
        >
          Add section
        </Button>
      </div>
    </div>
  );
}

export type SheetProps = Omit<
  ComponentProps<typeof RowSheet>,
  "title" | "children"
>;

function LineItem({
  row,
  number,
  invalid,
  sheet,
  inputRef,
  menuRef,
  onEdit,
  onPaste,
}: {
  row: LineRow;
  number: number;
  invalid: boolean;
  sheet: SheetProps;
  inputRef: ReturnType<RowInputRef>;
  menuRef: ReturnType<MenuRef>;
  onEdit: (fields: Partial<Omit<LineRow, "kind" | "key">>) => void;
  onPaste: (event: ClipboardEvent) => void;
}) {
  const noteId = useId();
  const optionalId = useId();
  const detail = [row.note.trim(), row.optional ? "optional" : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          value={row.amount}
          onChange={(event) => onEdit({ amount: event.target.value })}
          aria-label={`Amount, ingredient ${number}`}
          aria-invalid={invalid}
          placeholder="Qty"
          autoComplete="off"
          className="w-11 shrink-0"
        />
        <NativeSelect
          value={row.unit ?? ""}
          onChange={(event) =>
            onEdit({
              unit: UNITS.find((unit) => unit === event.target.value) ?? null,
            })
          }
          aria-label={`Unit, ingredient ${number}`}
          // Fits the longest label beside the chevron; "package" is shortened to fit.
          className="w-20 shrink-0"
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          {UNITS.map((unit) => (
            <NativeSelectOption key={unit} value={unit}>
              {unit === "package" ? "pkg" : unitLabel(unit, 1)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          ref={inputRef}
          value={row.name}
          onChange={(event) => onEdit({ name: event.target.value })}
          onPaste={onPaste}
          aria-label={`Ingredient ${number}`}
          aria-invalid={invalid}
          placeholder="Ingredient"
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Button
          ref={menuRef}
          type="button"
          variant="quiet"
          size="icon-lg"
          aria-label={`Note, optional, move or remove ingredient ${number}`}
          onClick={() => sheet.onOpenChange(true)}
        >
          <Ellipsis />
        </Button>
      </div>
      {detail && <p className="text-muted-foreground pl-1 text-sm">{detail}</p>}
      <RowSheet title={row.name.trim() || `Ingredient ${number}`} {...sheet}>
        <Field>
          <FieldLabel htmlFor={noteId}>Note</FieldLabel>
          <Input
            id={noteId}
            value={row.note}
            onChange={(event) => onEdit({ note: event.target.value })}
            placeholder="minced, to taste, or Greek yogurt"
            autoComplete="off"
          />
          <FieldDescription>
            Shown on the recipe, left off the grocery list.
          </FieldDescription>
        </Field>
        <FieldLabel htmlFor={optionalId}>
          <Field orientation="horizontal">
            <Checkbox
              id={optionalId}
              checked={row.optional}
              onCheckedChange={(checked) => onEdit({ optional: checked })}
            />
            <FieldContent>
              <FieldTitle>Optional</FieldTitle>
              <FieldDescription>Left off the grocery list.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </RowSheet>
    </li>
  );
}

// A section row, for ingredients and steps alike: its name inline, move and remove in its sheet.
export function SectionItem({
  row,
  number,
  sheet,
  inputRef,
  menuRef,
  onRetitle,
}: {
  row: SectionRow;
  // Which section it is, so each name field has its own label.
  number: number;
  sheet: SheetProps;
  inputRef: ReturnType<RowInputRef>;
  menuRef: ReturnType<MenuRef>;
  onRetitle: (title: string) => void;
}) {
  const title = row.title.trim();
  return (
    <div className="flex flex-col gap-1 pt-2">
      <span className="text-muted-foreground text-xs font-semibold uppercase">
        Section
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={row.title}
          onChange={(event) => onRetitle(event.target.value)}
          aria-label={`Section ${number} name`}
          placeholder="For the sauce"
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Button
          ref={menuRef}
          type="button"
          variant="quiet"
          size="icon-lg"
          aria-label={`Move or remove section ${title}`}
          onClick={() => sheet.onOpenChange(true)}
        >
          <Ellipsis />
        </Button>
      </div>
      <RowSheet title={title || "Section"} {...sheet} />
    </div>
  );
}
