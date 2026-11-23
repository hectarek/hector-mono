"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { giveBack, passAlong, takeBackPassAlong } from "@/app/actions/loans";
import type { ActionState } from "@/app/actions/shared";

// One move's button, its error under it, and its message once it's done.
function useMove(then?: () => void) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const run = (move: () => Promise<ActionState>) =>
    startTransition(async () => {
      setError(undefined);
      const result = await callResultAction(move);
      if (result && "message" in result && result.message) {
        then?.();
        notify(result.message);
        return;
      }
      setError(result?.error ?? undefined);
    });
  return { error, pending, run };
}

function MoveError({ error }: { error: string | undefined }) {
  return error ? (
    <p role="alert" className="text-xs text-destructive">
      {error}
    </p>
  ) : null;
}

// C11's When you've handed it over: I gave it to Jo, or I gave it back to Sam after all, today.
// Either goes back to the loan's page, which reads "Waiting for Jo to confirm" or "Waiting for Sam
// to confirm".
export function HandItOver({
  loanId,
  next,
  owner,
  today,
}: {
  loanId: string;
  next: string;
  owner: string;
  today: string;
}) {
  const router = useRouter();
  const { error, pending, run } = useMove(() =>
    router.push(`/loans/${loanId}`),
  );
  return (
    <div className="flex flex-col gap-2.5">
      <MoveError error={error} />
      <Button
        size="lg"
        disabled={pending}
        onClick={() => run(() => passAlong(loanId, next))}
      >
        I gave it to {next}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        disabled={pending}
        onClick={() => run(() => giveBack(loanId, today, owner))}
      >
        I gave it back to {owner}
      </Button>
    </div>
  );
}

// The giver's I still have it, while the next friend hasn't confirmed: the loan is out again, and
// the next friend is told.
export function TakeItBack({ loanId, next }: { loanId: string; next: string }) {
  const { error, pending, run } = useMove();
  return (
    <div className="flex flex-col gap-2.5">
      <MoveError error={error} />
      <Button
        variant="secondary"
        size="lg"
        disabled={pending}
        onClick={() => run(() => takeBackPassAlong(loanId, next))}
      >
        I still have it
      </Button>
    </div>
  );
}
