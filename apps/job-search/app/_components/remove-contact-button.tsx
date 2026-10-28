"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { removeContact } from "@/app/actions/people";

// Takes a person off a job's contacts (R1), Hector's alone (R21). Nothing else goes with it, so it
// asks nothing first: the person and their interactions stay.
export function RemoveContactButton({
  personId,
  jobId,
}: {
  personId: string;
  jobId: string;
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-destructive text-sm">
          {error}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="lg"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await callAction(() =>
              removeContact({ personId, jobId }),
            );
            setError(result.ok ? undefined : result.message);
          })
        }
        className="min-h-11"
      >
        Remove
      </Button>
    </div>
  );
}
