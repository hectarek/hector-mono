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
import { useState, useTransition } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { logInteraction } from "@/app/actions/interactions";
import { updateJob } from "@/app/actions/jobs";
import { updatePerson } from "@/app/actions/people";

// What a next step's sheet changes: a job's or a person's next step and date, read with the
// record's updatedAt.
export type NextStepRecord = {
  id: string;
  updatedAt: Date;
  nextStep: string | null;
  nextDate: string | null;
};
type NextStepField = "nextStep" | "nextDate";

const fieldsOf = (record: NextStepRecord): Record<NextStepField, string> => ({
  nextStep: record.nextStep ?? "",
  nextDate: record.nextDate ?? "",
});

function isNextStepRecord(value: unknown): value is NextStepRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "nextStep" in value &&
    "nextDate" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// A due row's next step (R9): a sheet that changes the step, moves the date, or clears both, for a
// job or a person, and for a person also logs a sent message. A change is made against the
// updatedAt the row read (R22): on a conflict the sheet stays open on the record as it is now, with
// what was typed kept (docs/build-plan.md KTD15). Saved, the sheet closes and the page refreshes
// without the row, or with its new date.
export function NextStepSheet({
  kind,
  record,
  name,
}: {
  kind: "job" | "person";
  record: NextStepRecord;
  // What the record is called, for the sheet's title: a job's role, a person's name.
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useRecordForm(record, fieldsOf, isNextStepRecord);
  const { failure } = form;
  const [sendError, setSendError] = useState<string>();
  const [isSending, startSending] = useTransition();
  const busy = form.isPending || isSending;

  function save(changes: Partial<Record<NextStepField, string | null>>) {
    const input = {
      id: form.opened.id,
      updatedAt: form.opened.updatedAt.toISOString(),
      ...changes,
    };
    const done = (saved: NextStepRecord) => {
      form.reopen(saved);
      setOpen(false);
    };
    if (kind === "job") {
      form.save(() => updateJob(input), done);
    } else {
      form.save(() => updatePerson(input), done);
    }
  }

  const edits = () =>
    Object.fromEntries(
      form.edited.map((field) => [field, form.fields[field].trim() || null]),
    );

  // A person's sheet also logs a sent message, moving the next step to what was typed, if anything.
  function logSent() {
    startSending(async () => {
      const result = await callAction(() =>
        logInteraction({
          personIds: [form.opened.id],
          kind: "message-sent",
          ...edits(),
        }),
      );
      if (result.ok) {
        setSendError(undefined);
        setOpen(false);
        return;
      }
      setSendError(result.message);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="secondary" size="lg" className="min-h-11" />}
      >
        Change
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-dvh overflow-y-auto"
      >
        <SheetCloseButton />
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            Change the next step, move its date, or clear both.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          {failure?.code === "conflict" ? (
            <ConflictNotice
              what={kind === "job" ? "the job" : "the person"}
              changes={form.changes}
            />
          ) : null}
          <FieldGroup>
            <FormField
              id={`next-step-${record.id}`}
              label={FIELD_LABELS.nextStep ?? "Next step"}
              kind="text"
              value={form.fields.nextStep}
              onChange={(text) => form.setField("nextStep", text)}
              error={failure?.fields?.nextStep}
              maxLength={120}
            />
            <FormField
              id={`next-date-${record.id}`}
              label={FIELD_LABELS.nextDate ?? "Next date"}
              kind="date"
              value={form.fields.nextDate}
              onChange={(text) => form.setField("nextDate", text)}
              error={failure?.fields?.nextDate}
            />
          </FieldGroup>
          {failure && failure.code !== "conflict" && !failure.fields ? (
            <p role="alert" className="text-destructive text-sm">
              {failure.message}
            </p>
          ) : null}
          {sendError ? (
            <p role="alert" className="text-destructive text-sm">
              {sendError}
            </p>
          ) : null}
        </div>
        <SheetFooter>
          <Button
            size="lg"
            disabled={busy || form.edited.length === 0}
            onClick={() => save(edits())}
            className="min-h-11"
          >
            {form.isPending ? "Saving…" : "Save"}
          </Button>
          {kind === "person" ? (
            <Button
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={logSent}
              className="min-h-11"
            >
              {isSending ? "Logging…" : "Log sent"}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={() => save({ nextStep: null, nextDate: null })}
            className="min-h-11"
          >
            Clear
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
