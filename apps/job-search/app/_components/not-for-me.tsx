"use client";

import { Button } from "@repo/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { type FormEvent, useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { CLOSE_REASONS } from "@/app/_lib/job-labels";
import { notify } from "@/app/_lib/notify";
import { closeJob, setJobStatus } from "@/app/actions/jobs";
import type { ActionResult } from "@/app/actions/shared";
import type { JobSummary } from "@/src/entities/models/job.model";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;

// Not for me (R20 as revised 2026-11-10): a job not yet applied to is archived as skipped, with
// skipped's reasons as one tap or another typed, so it leaves the ranked list and its posting
// can't come back. The toast's Undo, Hector's alone (R21), moves it back with its next step as it
// was.
export function NotForMe({
  job,
  human,
}: {
  job: Pick<JobSummary, "id" | "role" | "status" | "nextStep" | "nextDate">;
  human: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();

  function opening(next: boolean) {
    if (next) {
      setTyped("");
      setFailure(undefined);
    }
    setOpen(next);
  }

  function skip(reason: string) {
    startTransition(async () => {
      const result = await callAction(() =>
        closeJob({ id: job.id, status: "skipped", reason }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setOpen(false);
      notify(
        `Not for me: ${job.role}. ${reason}.`,
        human ? { action: { label: "Undo", onClick: undo } } : {},
      );
    });
  }

  async function undo() {
    const result = await callAction(() =>
      setJobStatus({
        id: job.id,
        status: job.status,
        nextStep: job.nextStep,
        nextDate: job.nextDate,
      }),
    );
    notify(result.ok ? `${job.role} is back on the list.` : result.message);
  }

  function skipWithTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typed.trim()) {
      skip(typed.trim());
    }
  }

  return (
    <Sheet open={open} onOpenChange={opening}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label={`Not for me: ${job.role}`}
            className="min-h-11"
          />
        }
      >
        Not for me
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-dvh w-full max-w-xl"
      >
        {/* Only the reasons scroll, so the header and the button stay on screen. */}
        <form onSubmit={skipWithTyped} className="flex min-h-0 flex-1 flex-col">
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>Not for me</SheetTitle>
            <SheetDescription>
              {job.role} leaves the list, archived as skipped, and its posting
              won&apos;t come back. Pick why.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
            <div className="flex flex-wrap gap-2">
              {CLOSE_REASONS.skipped.map((reason) => (
                <Button
                  key={reason}
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isPending}
                  onClick={() => skip(reason)}
                  className="min-h-11"
                >
                  {reason}
                </Button>
              ))}
            </div>
            <FormField
              id={`not-for-me-${job.id}`}
              label="Another reason"
              kind="text"
              value={typed}
              onChange={setTyped}
              error={failure?.fields?.reason}
              maxLength={200}
            />
            {failure && !failure.fields ? (
              <p role="alert" className="text-destructive text-sm">
                {failure.message}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              disabled={isPending || !typed.trim()}
              className="min-h-11"
            >
              {isPending ? "Archiving…" : "Archive with that reason"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
