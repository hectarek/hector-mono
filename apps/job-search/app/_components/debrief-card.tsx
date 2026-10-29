"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatMoment } from "@/app/_lib/format-day";
import { logInteraction } from "@/app/actions/interactions";
import type { ActionResult } from "@/app/actions/shared";
import type { ConversationToDebrief } from "@/src/entities/models/today.model";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;

const OUTCOMES = {
  choices: [
    { value: "held", label: "Held" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no-show", label: "No-show" },
  ],
};

// A conversation to debrief on This week (R8, R9): how it ended (held, cancelled or no-show),
// with a note, and the person's next step and date if Hector adds them. Saved, the page refreshes
// without it.
export function DebriefCard({ debrief }: { debrief: ConversationToDebrief }) {
  const { conversation, person } = debrief;
  const [fields, setFields] = useState({
    outcome: "",
    note: "",
    nextStep: "",
    nextDate: "",
  });
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();
  const id = `debrief-${conversation.id}`;
  const set = (field: keyof typeof fields) => (text: string) =>
    setFields((typed) => ({ ...typed, [field]: text }));

  function save() {
    startTransition(async () => {
      const result = await callAction(() =>
        logInteraction({
          conversationId: conversation.id,
          outcome: fields.outcome,
          ...(fields.note.trim() && { note: fields.note.trim() }),
          ...(fields.nextStep.trim() && { nextStep: fields.nextStep.trim() }),
          ...(fields.nextDate && { nextDate: fields.nextDate }),
        }),
      );
      setFailure(result.ok ? undefined : result);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            <Link
              href={`/people/${person.id}`}
              className="underline-offset-4 hover:underline"
            >
              {person.name}
            </Link>
          </ItemTitle>
          <ItemDescription>
            {conversation.startsAt
              ? `Conversation, ${formatMoment(conversation.startsAt)}`
              : "Conversation"}
          </ItemDescription>
        </ItemContent>
      </Item>
      <FieldGroup>
        <FormField
          id={`${id}-outcome`}
          label={FIELD_LABELS.outcome ?? "How it went"}
          kind={OUTCOMES}
          value={fields.outcome}
          onChange={set("outcome")}
          error={failure?.fields?.outcome}
        />
        <FormField
          id={`${id}-note`}
          label={FIELD_LABELS.note ?? "Note"}
          kind="long"
          value={fields.note}
          onChange={set("note")}
          error={failure?.fields?.note}
          maxLength={500}
        />
        <FormField
          id={`${id}-next-step`}
          label={FIELD_LABELS.nextStep ?? "Next step"}
          kind="text"
          value={fields.nextStep}
          onChange={set("nextStep")}
          error={failure?.fields?.nextStep}
          maxLength={120}
        />
        <FormField
          id={`${id}-next-date`}
          label={FIELD_LABELS.nextDate ?? "Next date"}
          kind="date"
          value={fields.nextDate}
          onChange={set("nextDate")}
          error={failure?.fields?.nextDate}
        />
      </FieldGroup>
      {failure && !failure.fields ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <Button
        size="lg"
        disabled={isPending || !fields.outcome}
        onClick={save}
        className="min-h-11 w-fit"
      >
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
