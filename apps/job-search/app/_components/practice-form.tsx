"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import {
  freshTry,
  TryFields,
  tryInput,
} from "@/app/_components/practice-fields";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { logPractice } from "@/app/actions/practice";
import type { ActionResult } from "@/app/actions/shared";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;

// Logging a practice session (R11): its problem or topic, type and pattern, and how the try went,
// today unless the date changes. Saved, it goes back to the practice page, where its first review
// shows as scheduled.
export function PracticeForm() {
  const router = useRouter();
  const [session, setSession] = useState({ topic: "", type: "", pattern: "" });
  const [tried, setTried] = useState(freshTry);
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();

  const set = (changes: Partial<typeof session>) =>
    setSession((now) => ({ ...now, ...changes }));

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() =>
        logPractice({
          topic: session.topic,
          ...(session.type.trim() && { type: session.type }),
          ...(session.pattern.trim() && { pattern: session.pattern }),
          ...tryInput(tried),
        }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      router.push("/practice");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <FieldGroup>
        <FormField
          id="practice-topic"
          label={FIELD_LABELS.topic ?? "Problem or topic"}
          kind="text"
          value={session.topic}
          onChange={(topic) => set({ topic })}
          error={failure?.fields?.topic}
          required
          maxLength={200}
        />
        <FormField
          id="practice-type"
          label={FIELD_LABELS.type ?? "Type"}
          kind="text"
          value={session.type}
          onChange={(type) => set({ type })}
          error={failure?.fields?.type}
          maxLength={60}
        />
        <FormField
          id="practice-pattern"
          label={FIELD_LABELS.pattern ?? "Pattern"}
          kind="text"
          value={session.pattern}
          onChange={(pattern) => set({ pattern })}
          error={failure?.fields?.pattern}
          maxLength={60}
        />
        <TryFields
          id="practice"
          values={tried}
          onChange={setTried}
          errors={failure?.fields}
        />
      </FieldGroup>
      {failure && !failure.fields ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <div>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !tried.result}
          className="min-h-11"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
