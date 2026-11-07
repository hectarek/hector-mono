import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { DisplayLabel, SectionTitle } from "@/app/_components/display";
import {
  type NextStepRecord,
  NextStepSheet,
} from "@/app/_components/next-step-sheet";
import { dueLabel } from "@/app/_lib/format-day";
import type { JobStage } from "@/src/entities/job-lifecycle";
import type { PersonRef } from "@/src/entities/models/person.model";

// A record's Next, right under its header (the UX plan's UX8): the step and when it's due, with
// Done and Push, a due row's sheet opened on each (UX3), and Change, the record's form. With no
// step, the form sets one.
export function RecordNext({
  kind,
  record,
  title,
  href,
  today,
  job,
  contacts,
}: {
  kind: "job" | "person";
  record: NextStepRecord;
  // Who or what the step is for, as the sheet's title.
  title: string;
  // The record's page.
  href: string;
  // Today in Eastern time, from the server (KTD18).
  today: string;
  job?: Pick<JobStage, "status" | "appliedOn">;
  contacts?: PersonRef[];
}) {
  const { nextStep, nextDate } = record;
  const due = nextDate ? dueLabel(nextDate, today) : null;
  const sheet = (
    opensOn: "done" | "push",
    variant: "default" | "secondary",
  ) => (
    <NextStepSheet
      kind={kind}
      record={record}
      title={title}
      detail={[nextStep, due].filter(Boolean).join(" · ")}
      href={href}
      job={job}
      contacts={contacts}
      opensOn={opensOn}
      trigger={<Button variant={variant} size="lg" className="min-h-11" />}
    >
      {opensOn === "done" ? "Done" : "Push"}
    </NextStepSheet>
  );

  return (
    <section aria-labelledby="record-next" className="flex flex-col gap-3">
      <SectionTitle id="record-next">Next</SectionTitle>
      {nextStep ? (
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-bold break-words">{nextStep}</span>
          {due ? (
            <DisplayLabel
              className={
                nextDate && nextDate < today ? "text-warning" : undefined
              }
            >
              {due}
            </DisplayLabel>
          ) : null}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">No next step.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {nextStep ? (
          <>
            {sheet("done", "default")}
            {sheet("push", "secondary")}
          </>
        ) : null}
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href={`${href}/edit`} />}
          className="min-h-11"
        >
          {nextStep ? "Change" : "Set one"}
        </Button>
      </div>
    </section>
  );
}
