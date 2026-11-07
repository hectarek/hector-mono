"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { type FieldKind, FormField } from "@/app/_components/form-field";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { BLOCK_STATE_LABELS, EFFORT_LABELS } from "@/app/_lib/job-labels";
import { localOf, minutesAfter, momentOf } from "@/app/_lib/local-time";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { addBlocks, updateBlock } from "@/app/actions/blocks";
import {
  BLOCK_STATES,
  type Block,
  EFFORTS,
} from "@/src/entities/models/block.model";

type Fact =
  | "title"
  | "effort"
  | "startsAt"
  | "endsAt"
  | "doneWhen"
  | "state"
  | "whatHappened";
type Fields = Record<Fact, string>;

// A new block runs an hour until its end is set.
const BLOCK_MINUTES = 60;

// Each fact the form holds, in its order, how it's typed, and how long it may be.
const FACTS: readonly {
  fact: Fact;
  kind: FieldKind;
  maxLength?: number;
  description?: string;
}[] = [
  { fact: "title", kind: "text", maxLength: 120 },
  {
    fact: "effort",
    kind: {
      choices: EFFORTS.map((value) => ({
        value,
        label: EFFORT_LABELS[value],
      })),
    },
    description: "Upkeep is planning and reviews",
  },
  { fact: "startsAt", kind: "datetime", description: "Eastern time" },
  { fact: "endsAt", kind: "datetime" },
  {
    fact: "doneWhen",
    kind: "text",
    maxLength: 300,
    description: "Read after “Done when”: five messages are sent",
  },
  {
    fact: "state",
    kind: {
      choices: BLOCK_STATES.map((value) => ({
        value,
        label: BLOCK_STATE_LABELS[value],
      })),
    },
  },
  { fact: "whatHappened", kind: "long", maxLength: 1000 },
];

const fieldsOf = (block: Block | undefined): Fields => ({
  title: block?.title ?? "",
  effort: block?.effort ?? "",
  startsAt: block ? localOf(block.startsAt) : "",
  endsAt: block ? localOf(block.endsAt) : "",
  doneWhen: block?.doneWhen ?? "",
  state: block?.state ?? "planned",
  whatHappened: block?.whatHappened ?? "",
});

const isBlock = (value: unknown): value is Block =>
  typeof value === "object" &&
  value !== null &&
  "startsAt" in value &&
  "effort" in value &&
  "updatedAt" in value &&
  value.updatedAt instanceof Date;

// What a field's text saves: a time as the moment it names, the title and effort as typed (blank
// ones are refused by the answer), and other blanks as none.
function savedValue(fact: Fact, text: string): string | null {
  const trimmed = text.trim();
  if (fact === "startsAt" || fact === "endsAt") {
    return trimmed ? momentOf(trimmed) : trimmed;
  }
  return fact === "title" || fact === "effort" || fact === "state"
    ? trimmed
    : trimmed || null;
}

// Adds a Focus block, or changes one (R26, docs/build-plan.md U17). A change sends only the facts
// edited, against the updatedAt read with the block, and on a conflict stays open on the block as
// it is now, with what was typed kept (R22, KTD15). Saved, it opens the block.
export function BlockForm({ block }: { block?: Block }) {
  const router = useRouter();
  const form = useRecordForm(block, fieldsOf, isBlock);
  const { failure } = form;

  function setField(fact: Fact, text: string) {
    form.setField(fact, text);
    // The end follows the start until it's set after it.
    const { endsAt } = form.fields;
    if (fact === "startsAt" && text && (!endsAt || endsAt <= text)) {
      form.setField("endsAt", minutesAfter(text, BLOCK_MINUTES));
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { opened, fields } = form;
    const saving = opened ? form.edited : FACTS.map(({ fact }) => fact);
    const facts = Object.fromEntries(
      saving.map((fact) => [fact, savedValue(fact, fields[fact])]),
    );
    if (opened) {
      form.save(
        () =>
          updateBlock({
            id: opened.id,
            updatedAt: opened.updatedAt.toISOString(),
            ...facts,
          }),
        (saved) => router.push(`/blocks/${saved.id}`),
      );
      return;
    }
    form.save(
      () => addBlocks({ blocks: [facts] }),
      ([added]) => router.push(added ? `/blocks/${added.id}` : "/week"),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {failure?.code === "conflict" ? (
        <ConflictNotice what="the block" changes={form.changes} />
      ) : null}
      <FieldGroup>
        {FACTS.map(({ fact, kind, maxLength, description }) => (
          <FormField
            key={fact}
            id={`block-${fact}`}
            label={FIELD_LABELS[fact] ?? fact}
            kind={kind}
            value={form.fields[fact]}
            onChange={(text) => setField(fact, text)}
            error={failure?.fields?.[fact]}
            description={description}
            required={
              fact === "title" || fact === "startsAt" || fact === "endsAt"
            }
            maxLength={maxLength}
          />
        ))}
      </FieldGroup>
      {failure && failure.code !== "conflict" && !failure.fields ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={form.isPending}
          className="min-h-11"
        >
          {form.isPending ? "Saving…" : block ? "Save" : "Add block"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href={block ? `/blocks/${block.id}` : "/week"} />}
          className="min-h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
