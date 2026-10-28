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
import {
  freshTry,
  TryFields,
  tryInput,
} from "@/app/_components/practice-fields";
import { callAction } from "@/app/_lib/call-action";
import { logPractice } from "@/app/actions/practice";
import type { ActionResult } from "@/app/actions/shared";
import { LADDER_STEPS, type ReviewStep } from "@/src/entities/practice-ladder";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;

// Logging a session's next review (R11): a sheet that opens from a due review or the session's
// page, dated today unless changed, saved once the result is picked. Saved, the sheet closes and
// the page refreshes with the review the ladder schedules next.
export function PracticeReview({
  session,
}: {
  session: { id: string; topic: string; step: ReviewStep };
}) {
  const [open, setOpen] = useState(false);
  const [tried, setTried] = useState(freshTry);
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await callAction(() =>
        logPractice({ sessionId: session.id, ...tryInput(tried) }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setFailure(undefined);
      setTried(freshTry());
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="secondary" size="lg" className="min-h-11" />}
      >
        Log review
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-dvh overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Review {session.step} of {LADDER_STEPS}
          </SheetTitle>
          <SheetDescription>
            {session.topic}, today unless you change the date.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <FieldGroup>
            <TryFields
              id={`review-${session.id}`}
              values={tried}
              onChange={setTried}
              errors={failure?.fields}
            />
          </FieldGroup>
        </div>
        {failure && !failure.fields ? (
          <p role="alert" className="text-destructive px-4 text-sm">
            {failure.message}
          </p>
        ) : null}
        <SheetFooter>
          <Button
            size="lg"
            disabled={isPending || !tried.result}
            onClick={save}
            className="min-h-11"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
