"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { BLOCK_ROW, BlockFace, NOW_ROW } from "@/app/_components/block-row";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { withFrom } from "@/app/_lib/back-link";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatTime } from "@/app/_lib/format-day";
import { BLOCK_STATE_LABELS, EFFORT_LABELS } from "@/app/_lib/job-labels";
import { notify } from "@/app/_lib/notify";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { getBlock, updateBlock } from "@/app/actions/blocks";
import type { Block, BlockState } from "@/src/entities/models/block.model";

// The states as the sheet offers them, the likeliest first.
const STATES: readonly { value: BlockState; label: string }[] = (
  ["done", "partial", "moved", "skipped", "planned"] as const
).map((value) => ({ value, label: BLOCK_STATE_LABELS[value] }));

type Fields = { state: string; whatHappened: string };
type Outcome = Pick<Block, "state" | "whatHappened">;

const fieldsOf = (block: Block): Fields => ({
  state: block.state,
  whatHappened: block.whatHappened ?? "",
});

const isBlock = (value: unknown): value is Block =>
  typeof value === "object" &&
  value !== null &&
  "state" in value &&
  "startsAt" in value;

// A block's row that opens how it went (R26, docs/build-plan.md U17): a sheet, a form as UX3's
// are, that sets the block's state and what happened against the updatedAt the row read (R22).
// A save says what it did in a toast, with Undo.
export function BlockSheet({ block, now }: { block: Block; now: boolean }) {
  const [open, setOpen] = useState(false);
  const form = useRecordForm(block, fieldsOf, isBlock);
  const { opened } = form;
  const busy = form.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const before: Outcome = {
      state: opened.state,
      whatHappened: opened.whatHappened,
    };
    const changes = Object.fromEntries(
      form.edited.map((field) => [field, form.fields[field].trim() || null]),
    );
    form.save(
      () =>
        updateBlock({
          id: opened.id,
          updatedAt: opened.updatedAt.toISOString(),
          ...changes,
        }),
      (saved: Block) => {
        form.reopen(saved);
        setOpen(false);
        notify(said(saved, before), {
          action: { label: "Undo", onClick: () => undo(saved.id, before) },
        });
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          now ? (
            <button type="button" className={NOW_ROW} />
          ) : (
            <button type="button" className={BLOCK_ROW} />
          )
        }
      >
        <BlockFace block={block} now={now} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-dvh w-full max-w-xl"
      >
        {/* Only the fields scroll, so the header and the button stay on screen. */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>{opened.title}</SheetTitle>
            <SheetDescription>
              {EFFORT_LABELS[opened.effort]} · {formatTime(opened.startsAt)} to{" "}
              {formatTime(opened.endsAt)}
              {opened.doneWhen ? `. Done when ${opened.doneWhen}` : ""}
            </SheetDescription>
            <Link
              href={withFrom(`/blocks/${opened.id}`, "/")}
              className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline underline-offset-4"
            >
              Go to the block
            </Link>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            {form.failure?.code === "conflict" ? (
              <ConflictNotice what="the block" changes={form.changes} />
            ) : null}
            <FieldGroup>
              <FormField
                id={`block-${opened.id}-state`}
                label="How it went"
                kind={{ choices: STATES }}
                value={form.fields.state}
                onChange={(state) => form.setField("state", state)}
                error={form.failure?.fields?.state}
              />
              <FormField
                id={`block-${opened.id}-what-happened`}
                label={FIELD_LABELS.whatHappened ?? "What happened"}
                kind="long"
                value={form.fields.whatHappened}
                onChange={(text) => form.setField("whatHappened", text)}
                error={form.failure?.fields?.whatHappened}
                maxLength={1000}
              />
            </FieldGroup>
            {form.failure &&
            form.failure.code !== "conflict" &&
            !form.failure.fields ? (
              <p role="alert" className="text-destructive text-sm">
                {form.failure.message}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              disabled={busy || form.edited.length === 0}
              className="min-h-11"
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// What a save did, for its toast.
function said(saved: Block, before: Outcome): string {
  return saved.state === before.state
    ? `Saved what happened: ${saved.title}.`
    : `Marked ${BLOCK_STATE_LABELS[saved.state].toLowerCase()}: ${saved.title}.`;
}

// Puts the state and what happened back, against the block as it is now.
async function undo(id: string, before: Outcome) {
  const now = await callAction(() => getBlock({ id }));
  const back =
    now.ok &&
    (
      await callAction(() =>
        updateBlock({
          id,
          updatedAt: now.data.updatedAt.toISOString(),
          ...before,
        }),
      )
    ).ok;
  notify(back ? "Put back as it was." : "Couldn't undo it.");
}
