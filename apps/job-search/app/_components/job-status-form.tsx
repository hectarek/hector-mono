"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import { type FormEvent, useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import { callAction } from "@/app/_lib/call-action";
import { STATUS_LABELS } from "@/app/_lib/job-labels";
import { useToday } from "@/app/_lib/use-today";
import { closeJob, setJobStatus } from "@/app/actions/jobs";
import type { ActionResult } from "@/app/actions/shared";
import {
  CLOSED_STATUSES,
  type JobStatus,
  OPEN_STATUSES,
} from "@/src/entities/job-lifecycle";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;

const choices = (statuses: readonly JobStatus[]) => ({
  choices: statuses.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
});

const isClosing = (status: string) =>
  (CLOSED_STATUSES as readonly string[]).includes(status);

// Moves a job (R2): to an open status, or closed with a reason, on a date (today unless changed).
// The server sets applied-on, the follow-up and a closing's cleared next step (R3).
export function JobStatusForm({
  jobId,
  today,
}: {
  jobId: string;
  // The day the page was rendered, in Eastern time, from the server (KTD18): the date shown until
  // a status is picked.
  today: string;
}) {
  const [to, setTo] = useState("");
  // The move's date: null until changed, which dates the move on the day it's saved.
  const [on, setOn] = useState<string | null>(null);
  const day = useToday(today);
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();
  const closing = isClosing(to);

  // Picking a status starts a move, so the date's default is read again.
  const pick = (status: string) => {
    setTo(status);
    day.refresh();
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const when = on !== null ? { on } : {};
    startTransition(async () => {
      const result = await callAction(() =>
        closing
          ? closeJob({ id: jobId, status: to, reason, ...when })
          : setJobStatus({ id: jobId, status: to, ...when }),
      );
      if (result.ok) {
        setTo("");
        setReason("");
        setFailure(undefined);
        return;
      }
      setFailure(result);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FieldGroup>
        <FormField
          id="move-to"
          label="Move to"
          kind={choices(OPEN_STATUSES)}
          value={closing ? "" : to}
          onChange={pick}
          error={closing ? undefined : failure?.fields?.status}
        />
        <FormField
          id="close-as"
          label="Or close as"
          kind={choices(CLOSED_STATUSES)}
          value={closing ? to : ""}
          onChange={pick}
        />
        <FormField
          id="move-on"
          label="On"
          kind="date"
          value={on ?? day.today}
          onChange={setOn}
          error={failure?.fields?.on}
        />
        {closing ? (
          <FormField
            id="close-reason"
            label="Reason"
            kind="text"
            value={reason}
            onChange={setReason}
            error={failure?.fields?.reason}
            required
            maxLength={200}
          />
        ) : null}
      </FieldGroup>
      {failure && !failure.fields ? (
        <p role="alert" className="text-destructive text-sm">
          {failure.message}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={!to || isPending}
        className="min-h-11 w-fit"
      >
        {closing ? "Close" : "Move"}
      </Button>
    </form>
  );
}
