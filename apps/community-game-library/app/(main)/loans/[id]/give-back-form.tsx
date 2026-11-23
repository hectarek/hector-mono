"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { giveBack } from "@/app/actions/loans";
import { DayField } from "./day-field";

// C5's Gave it back on and I gave it back to Sam (R19): the day, from the pick-up to today. The
// page then reads "Waiting for Sam to confirm".
export function GiveBackForm({
  loanId,
  pickedUpOn,
  owner,
  today,
}: {
  loanId: string;
  pickedUpOn: string;
  owner: string;
  today: string;
}) {
  const [day, setDay] = useState(today);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      setError(undefined);
      const result = await callResultAction(() => giveBack(loanId, day, owner));
      if (result && "message" in result && result.message) {
        notify(result.message);
        return;
      }
      setError(result?.error ?? undefined);
    });

  return (
    <div className="flex flex-col gap-2.5">
      <DayField
        id={`gave-back-${loanId}`}
        label="Gave it back on"
        today={today}
        from={pickedUpOn}
        until={today}
        value={day}
        onChange={setDay}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button variant="secondary" size="lg" onClick={send} disabled={pending}>
        I gave it back to {owner}
      </Button>
    </div>
  );
}
