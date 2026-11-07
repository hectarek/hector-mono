"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { formatDay } from "@/app/_lib/format-day";
import { notify } from "@/app/_lib/notify";
import { pushDays } from "@/app/_lib/push-days";
import { useToday } from "@/app/_lib/use-today";
import { updateJob } from "@/app/actions/jobs";
import { updatePerson } from "@/app/actions/people";

// A next step with no date, dated in one tap (the UX plan's UX6): each chip saves the day against
// the updatedAt the list read (R22), and a toast says so. Once dated, a step keeps a date (Q1), so
// there's no Undo; another day is set on the record. On a conflict the list shows the record as it
// is now.
export function DateChips({
  kind,
  record,
  name,
}: {
  kind: "job" | "person";
  record: { id: string; updatedAt: Date; nextStep: string | null };
  // Whose step it is, as the chips and the toast name it: the person, or the job's role.
  name: string;
}) {
  const day = useToday();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function date(nextDate: string) {
    startTransition(async () => {
      const input = {
        id: record.id,
        updatedAt: record.updatedAt.toISOString(),
        nextDate,
      };
      const result =
        kind === "job"
          ? await callAction(() => updateJob(input))
          : await callAction(() => updatePerson(input));
      if (!result.ok) {
        notify(
          result.code === "conflict"
            ? `${name} changed since this list loaded. Here it is as it is now.`
            : result.message,
        );
        router.refresh();
        return;
      }
      notify(`${name}: ${record.nextStep}, ${formatDay(nextDate)}.`);
    });
  }

  return (
    <fieldset
      aria-label={`Date ${name}'s next step`}
      className="flex flex-wrap gap-2"
    >
      {pushDays(day.today).map(({ label, day: chip }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          size="lg"
          disabled={isPending}
          onClick={() => date(chip)}
          aria-label={`${label}, ${formatDay(chip)}`}
          className="min-h-11"
        >
          {label}
        </Button>
      ))}
    </fieldset>
  );
}
