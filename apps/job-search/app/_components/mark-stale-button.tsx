"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { closeJob } from "@/app/actions/jobs";

// The reason a stale candidate closes with, as the sheet's rule words it (R3).
const NO_REPLY = "No reply after 21 days";

// A stale candidate's one tap on This week (R3, R9): close the job as stale, with the reason
// filled in. Closed, the page refreshes without it.
export function MarkStaleButton({ jobId }: { jobId: string }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function markStale() {
    startTransition(async () => {
      const result = await callAction(() =>
        closeJob({ id: jobId, status: "stale", reason: NO_REPLY }),
      );
      setError(result.ok ? undefined : result.message);
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        disabled={isPending}
        onClick={markStale}
        className="min-h-11"
      >
        Mark stale
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </>
  );
}
