"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
import { Textarea } from "@repo/ui/components/textarea";
import { Ellipsis, Plus } from "lucide-react";
import { type ClipboardEvent, Fragment, useId, useState } from "react";
import {
  type MenuRef,
  type RowInputRef,
  SectionItem,
  type SheetProps,
  useRowMenus,
} from "@/app/_components/ingredient-rows";
import { RowSheet } from "@/app/_components/row-sheet";
import {
  emptyStep,
  type MethodRow,
  moveRow,
  newKey,
  pasteRows,
  rowRuns,
  type StepRow,
  stepRowsFromText,
} from "@/src/entities/editor-rows";

// The recipe editor's method (ux-plan P9.4): a row per step, its timer in its ⋯ sheet, and
// section rows that head the steps below them (D35).
export function StepRows({
  rows,
  onChange,
  invalidKey,
  inputRef,
  focus,
}: {
  rows: MethodRow[];
  onChange: (update: (rows: MethodRow[]) => MethodRow[]) => void;
  invalidKey: string | null;
  inputRef: RowInputRef;
  focus: (key: string) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { menuRef, focusMenu } = useRowMenus();
  const numbers = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === "step") numbers.set(row.key, numbers.size + 1);
  }

  function edit(key: string, fields: Partial<Omit<StepRow, "kind" | "key">>) {
    onChange((current) =>
      current.map((row) =>
        row.key === key && row.kind === "step" ? { ...row, ...fields } : row,
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

  function add(row: MethodRow) {
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

  // Pasted steps (a numbered list, or paragraphs) become rows: they fill this row if it's
  // empty, else go after it (`pasteRows`).
  function paste(event: ClipboardEvent, row: StepRow) {
    const text = event.clipboardData.getData("text");
    const pasted = text.includes("\n") ? stepRowsFromText(text) : [];
    if (pasted.length < 2) return;
    event.preventDefault();
    onChange((current) =>
      pasteRows(
        current,
        current.findIndex((candidate) => candidate.key === row.key),
        pasted,
        !row.text.trim(),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* A section, then a list of its steps numbered on from the last (D35), so a screen
          reader counts only steps. */}
      <div className="flex flex-col gap-3">
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
              <ol
                start={numbers.get(run.rows[0]?.key ?? "")}
                className="flex flex-col gap-3"
              >
                {run.rows.map((row) => (
                  <StepItem
                    key={row.key}
                    row={row}
                    number={numbers.get(row.key) ?? 0}
                    invalid={row.key === invalidKey}
                    inputRef={inputRef(row.key)}
                    menuRef={menuRef(row.key)}
                    onEdit={(fields) => edit(row.key, fields)}
                    onPaste={(event) => paste(event, row)}
                    sheet={sheetFor(row.key)}
                  />
                ))}
              </ol>
            )}
          </Fragment>
        ))}
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => add(emptyStep())}
        >
          <Plus data-icon="inline-start" />
          Add step
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

function StepItem({
  row,
  number,
  invalid,
  inputRef,
  menuRef,
  onEdit,
  onPaste,
  sheet,
}: {
  row: StepRow;
  number: number;
  invalid: boolean;
  inputRef: ReturnType<RowInputRef>;
  menuRef: ReturnType<MenuRef>;
  onEdit: (fields: Partial<Omit<StepRow, "kind" | "key">>) => void;
  onPaste: (event: ClipboardEvent) => void;
  sheet: SheetProps;
}) {
  const timerId = useId();
  const timer = row.timer.trim();

  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="text-primary font-heading w-5 shrink-0 pt-2 text-right"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Textarea
          ref={inputRef}
          value={row.text}
          onChange={(event) => onEdit({ text: event.target.value })}
          onPaste={onPaste}
          aria-label={`Step ${number}`}
          aria-invalid={invalid}
          rows={2}
          placeholder="Heat the oil in a large pan."
        />
        {timer && (
          <p className="text-muted-foreground text-sm">Timer: {timer} min</p>
        )}
      </div>
      <Button
        ref={menuRef}
        type="button"
        variant="quiet"
        size="icon-lg"
        aria-label={`Timer, move or remove step ${number}`}
        onClick={() => sheet.onOpenChange(true)}
      >
        <Ellipsis />
      </Button>
      <RowSheet title={`Step ${number}`} {...sheet}>
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={timerId}>Timer (minutes)</FieldLabel>
          <Input
            id={timerId}
            value={row.timer}
            onChange={(event) => onEdit({ timer: event.target.value })}
            aria-invalid={invalid}
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="10"
          />
          <FieldDescription>Cook mode offers it at this step.</FieldDescription>
        </Field>
      </RowSheet>
    </li>
  );
}
