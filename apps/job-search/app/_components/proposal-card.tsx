"use client";

import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OnlyHector } from "@/app/_components/only-hector";
import { callAction } from "@/app/_lib/call-action";
import { DISMISS_LABELS, WORK_MODE_LABELS } from "@/app/_lib/job-labels";
import { acceptProposal, dismissProposal } from "@/app/actions/jobs";
import type {
  DismissReason,
  JobSummary,
} from "@/src/entities/models/job.model";

// A proposal waiting for Hector on This week (R9, R20): Accept in one tap, or Dismiss and then a
// tap on the reason (KTD8). Either way the page refreshes without it. A proposal Claude changed
// since the page read it is refused, and the page refreshes, so he decides on the version he sees
// (R22).
export function ProposalCard({
  proposal,
  human,
}: {
  proposal: JobSummary;
  // Hector's session; Claude's sees the buttons off, as only his (KTD3).
  human: boolean;
}) {
  const router = useRouter();
  const [choosing, setChoosing] = useState(false);
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
      setChoosing(false);
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

  const where = [
    proposal.location,
    proposal.workMode ? WORK_MODE_LABELS[proposal.workMode] : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            <Link
              href={`/jobs/${proposal.id}`}
              className="underline-offset-4 hover:underline"
            >
              {proposal.role}
            </Link>
          </ItemTitle>
          <ItemDescription>
            {[proposal.company.name, ...where].join(" · ")}
          </ItemDescription>
        </ItemContent>
        {human ? null : (
          <ItemActions>
            <OnlyHector labels={["Accept", "Dismiss"]} />
          </ItemActions>
        )}
        {choosing || !human ? null : (
          <ItemActions>
            <Button
              size="lg"
              disabled={isPending}
              onClick={() => run(() => acceptProposal(read))}
              className="min-h-11"
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={isPending}
              onClick={() => setChoosing(true)}
              className="min-h-11"
            >
              Dismiss
            </Button>
          </ItemActions>
        )}
      </Item>
      {choosing ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Dismiss because</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DISMISS_LABELS) as DismissReason[]).map((reason) => (
              <Button
                key={reason}
                variant="secondary"
                size="lg"
                disabled={isPending}
                onClick={() => run(() => dismissProposal({ ...read, reason }))}
                className="min-h-11"
              >
                {DISMISS_LABELS[reason]}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="lg"
              disabled={isPending}
              onClick={() => setChoosing(false)}
              className="min-h-11"
            >
              Cancel
            </Button>
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
