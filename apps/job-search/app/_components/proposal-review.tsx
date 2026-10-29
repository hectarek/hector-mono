"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import { callAction } from "@/app/_lib/call-action";
import { DISMISS_LABELS } from "@/app/_lib/job-labels";
import {
  acceptProposal,
  dismissProposal,
  reopenProposal,
} from "@/app/actions/jobs";
import type { Job, ReviewState } from "@/src/entities/models/job.model";

const REASONS = {
  choices: Object.entries(DISMISS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
};

// The proposal as the page read it: a decision is made against its updatedAt (R22).
export type ProposalUnderReview = Pick<Job, "id" | "updatedAt"> & {
  reviewState: Exclude<ReviewState, "accepted">;
};

// Hector's call on a proposal (R20): accept it in one tap, or dismiss it with a reason and an
// optional note; a dismissed one can be reopened. Only he decides (R21), and the server refuses
// anyone else. A proposal Claude changed since the page read it is refused, and the page
// refreshes, so he decides on the version he sees.
export function ProposalReview({
  proposal,
}: {
  proposal: ProposalUnderReview;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const read = { id: proposal.id, updatedAt: proposal.updatedAt.toISOString() };

  function run(action: () => ReturnType<typeof acceptProposal>) {
    startTransition(async () => {
      const result = await callAction(action);
      if (result.ok) {
        setError(undefined);
        return;
      }
      if (result.code === "conflict") {
        setError(
          "Claude changed this job after you opened it. Check it again, then decide.",
        );
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  function dismiss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() => dismissProposal({ ...read, reason, note }));
  }

  if (proposal.reviewState === "dismissed") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          disabled={isPending}
          onClick={() => run(() => reopenProposal(read))}
          className="min-h-11 w-fit"
        >
          Reopen
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="lg"
        disabled={isPending}
        onClick={() => run(() => acceptProposal(read))}
        className="min-h-11 w-fit"
      >
        Accept
      </Button>
      <form onSubmit={dismiss} className="flex flex-col gap-4">
        <FieldGroup>
          <FormField
            id="dismiss-reason"
            label="Or dismiss it because"
            kind={REASONS}
            value={reason}
            onChange={setReason}
          />
          <FormField
            id="dismiss-note"
            label="Note"
            kind="text"
            value={note}
            onChange={setNote}
            maxLength={200}
          />
        </FieldGroup>
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={!reason || isPending}
          className="min-h-11 w-fit"
        >
          Dismiss
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
