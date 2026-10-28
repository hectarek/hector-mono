"use client";

import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { editedFields, rebased } from "@/app/_lib/form-changes";
import type { ActionResult } from "@/app/actions/shared";

// A record's form (R22, docs/build-plan.md KTD15): the record it opened on (none for a new one),
// each field as typed text, and the fields typed since it opened, which are all an edit sends. A
// save that meets a conflict leaves the form open on the record as it is now, with what was typed
// kept and the fields that changed since listed for its ConflictNotice.
export function useRecordForm<R, K extends string>(
  record: R,
  fieldsOf: (record: R) => Record<K, string>,
  isRecord: (value: unknown) => value is Exclude<R, undefined>,
) {
  const [opened, setOpened] = useState(record);
  const [fields, setFields] = useState(() => fieldsOf(record));
  const [result, setResult] = useState<ActionResult<unknown>>();
  const [changedSince, setChangedSince] = useState<K[]>([]);
  const [isPending, startTransition] = useTransition();

  // Runs the save, then onSaved with what it saved; on a conflict, the form takes the record as
  // it is now.
  function save<T>(
    run: () => Promise<ActionResult<T>>,
    onSaved: (data: T) => void,
  ) {
    startTransition(async () => {
      const answer = await callAction(run);
      setResult(answer);
      if (answer.ok) {
        onSaved(answer.data);
      } else if (
        answer.code === "conflict" &&
        opened !== undefined &&
        isRecord(answer.current)
      ) {
        const now = rebased(fields, fieldsOf(opened), fieldsOf(answer.current));
        setFields(now.fields);
        setChangedSince(now.changed);
        setOpened(answer.current);
      }
    });
  }

  // Opens the form again on a record just saved, for a form that stays on its page.
  function reopen(saved: R) {
    setOpened(saved);
    setFields(fieldsOf(saved));
    setChangedSince([]);
  }

  const now = fieldsOf(opened);

  return {
    opened,
    fields,
    setField: (key: K, text: string) =>
      setFields((typed) => ({ ...typed, [key]: text })),
    edited: editedFields(fields, now),
    save,
    reopen,
    isPending,
    failure: result?.ok === false ? result : undefined,
    saved: result?.ok === true,
    // Each field that changed since the form opened, and its value now.
    changes: changedSince.map((key) => ({
      label: FIELD_LABELS[key] ?? key,
      now: now[key],
    })),
  };
}
