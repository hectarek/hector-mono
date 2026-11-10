"use client";

import { Button } from "@repo/ui/components/button";
import { useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { pinJob } from "@/app/actions/jobs";

// Pins a job not yet applied to at the top of the ranked list, or unpins it (R27): one tap, and a
// toast that says so, with Undo.
export function PinButton({
  job,
}: {
  job: { id: string; role: string; pinnedAt: Date | null };
}) {
  const [isPending, startTransition] = useTransition();
  const pinned = job.pinnedAt !== null;

  function pin(to: boolean) {
    startTransition(async () => {
      const result = await callAction(() => pinJob({ id: job.id, pinned: to }));
      if (!result.ok) {
        notify(result.message);
        return;
      }
      notify(to ? `Pinned ${job.role} to the top.` : `Unpinned ${job.role}.`, {
        action: { label: "Undo", onClick: () => undo(!to) },
      });
    });
  }

  async function undo(to: boolean) {
    const result = await callAction(() => pinJob({ id: job.id, pinned: to }));
    notify(result.ok ? "Put back as it was." : "Couldn't undo it.");
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      disabled={isPending}
      onClick={() => pin(!pinned)}
      aria-label={`${pinned ? "Unpin" : "Pin"} ${job.role}`}
      className="min-h-11"
    >
      {pinned ? "Unpin" : "Pin"}
    </Button>
  );
}
