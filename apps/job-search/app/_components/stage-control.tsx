"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { type FormEvent, useState, useTransition } from "react";
import { DisplayLabel } from "@/app/_components/display";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { formatDay } from "@/app/_lib/format-day";
import { CLOSE_REASONS, STATUS_LABELS } from "@/app/_lib/job-labels";
import { notify } from "@/app/_lib/notify";
import { closeJob, setJobStatus } from "@/app/actions/jobs";
import { getPerson, updatePerson } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/shared";
import {
  CLOSED_STATUSES,
  type ClosedStatus,
  isClosed,
  type JobStage,
  type JobStatus,
  OPEN_STATUSES,
  type OpenStatus,
  stepAfterMove,
} from "@/src/entities/job-lifecycle";
import type { Job } from "@/src/entities/models/job.model";
import type { Person, PersonRef } from "@/src/entities/models/person.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

type Failure = Extract<ActionResult<unknown>, { ok: false }>;
type MovingJob = Pick<JobStage, "status" | "appliedOn"> & { id: string };

// The stages before applying, and the four from applying to an offer.
const BEFORE: readonly OpenStatus[] = ["verify", "target"];
const STAGES: readonly OpenStatus[] = ["applied", "screen", "onsite", "offer"];

const SHEET = "mx-auto max-h-dvh w-full max-w-xl";

// A job's moves on its page (R2, R3, the UX plan's UX9): the design system's stage control, with
// Verify and Target before the four stages from Applied to Offer. The current stage is filled and
// marked, the ones passed are shaded, and a tap on another opens what the move sets: its date and
// the new stage's next step, prefilled and changed as needed. Close sits behind its own button,
// with each closed status's reasons as one tap.
export function StageControl({
  job,
  contacts,
  today,
}: {
  job: MovingJob;
  contacts: PersonRef[];
  // The day the page was rendered, in Eastern time (KTD18), until a sheet opens.
  today: string;
}) {
  const at = (OPEN_STATUSES as readonly JobStatus[]).indexOf(job.status);
  const segment = (stage: OpenStatus) => {
    const index = OPEN_STATUSES.indexOf(stage);
    return index === at ? (
      <Button
        key={stage}
        type="button"
        size="lg"
        aria-current="step"
        className="min-h-11 w-full"
      >
        {STATUS_LABELS[stage]}
      </Button>
    ) : (
      <MoveSheet
        key={stage}
        job={job}
        to={stage}
        passed={index < at}
        today={today}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset
        aria-label="Move this job to a stage"
        className="flex flex-col gap-1"
      >
        <div className="grid grid-cols-2 gap-1">{BEFORE.map(segment)}</div>
        <div className="grid grid-cols-4 gap-1">{STAGES.map(segment)}</div>
      </fieldset>
      <CloseSheet job={job} contacts={contacts} today={today} />
    </div>
  );
}

type MoveFields = {
  // The day the sheet opened, which the move's date shows until it's changed.
  day: string;
  on: string | null;
  nextStep: string;
  nextDate: string;
  // Whether the step or its date was changed, which stops a new move date moving them.
  edited: boolean;
};

// A move to one stage: its date, today unless changed, and the step the move sets for the new
// stage, which a change of date moves with it until the step is changed (stepAfterMove).
function MoveSheet({
  job,
  to,
  passed,
  today,
}: {
  job: MovingJob;
  to: OpenStatus;
  passed: boolean;
  today: string;
}) {
  const prefilled = (day: string, on: string | null): MoveFields => {
    const next = stepAfterMove(to, on ?? day, job.appliedOn);
    return {
      day,
      on,
      nextStep: next.nextStep ?? "",
      nextDate: next.nextDate ?? "",
      edited: false,
    };
  };
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(() => prefilled(today, null));
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();
  const label = STATUS_LABELS[to];

  function opening(next: boolean) {
    if (next) {
      setFields(prefilled(todayIn(PLAN_TIME_ZONE), null));
      setFailure(undefined);
    }
    setOpen(next);
  }

  function moveOn(on: string) {
    setFields((now) =>
      now.edited ? { ...now, on } : prefilled(now.day, on || null),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() =>
        setJobStatus({
          id: job.id,
          status: to,
          ...(fields.on !== null && { on: fields.on }),
          nextStep: fields.nextStep.trim() || null,
          nextDate: fields.nextDate || null,
        }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setOpen(false);
      notify(`Moved to ${label}. ${nextOf(result.data)}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={opening}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant={passed ? "secondary" : "outline"}
            size="lg"
            className="min-h-11 w-full"
          />
        }
      >
        {label}
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className={SHEET}>
        {/* Only the fields scroll, so the header and the button stay on screen. */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>Move to {label}</SheetTitle>
            <SheetDescription>
              From {STATUS_LABELS[job.status]}. The step below replaces the
              job&apos;s next step.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            <FieldGroup>
              <FormField
                id={`move-${to}-on`}
                label="On"
                kind="date"
                value={fields.on ?? fields.day}
                onChange={moveOn}
                error={failure?.fields?.on}
              />
              <FormField
                id={`move-${to}-step`}
                label="Next step"
                kind="text"
                value={fields.nextStep}
                onChange={(nextStep) =>
                  setFields((now) => ({ ...now, nextStep, edited: true }))
                }
                error={failure?.fields?.nextStep}
                maxLength={120}
              />
              <FormField
                id={`move-${to}-date`}
                label="Next date"
                kind="date"
                value={fields.nextDate}
                onChange={(nextDate) =>
                  setFields((now) => ({ ...now, nextDate, edited: true }))
                }
                error={failure?.fields?.nextDate}
                description="Left empty with a step, it's due a week from today"
              />
            </FieldGroup>
            {failure && !failure.fields ? (
              <p role="alert" className="text-destructive text-sm">
                {failure.message}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="min-h-11"
            >
              {isPending ? "Moving…" : `Move to ${label}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Closing a job: each closed status's reasons as one tap, or another reason typed, on a date
// (today unless changed). After the close, the job's contacts with a next step are listed, each
// with No next step, since a step about a closed job is done. It stays mounted once the job is
// closed, so that list outlives the page's refresh; only its button goes.
function CloseSheet({
  job,
  contacts,
  today,
}: {
  job: MovingJob;
  contacts: PersonRef[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(today);
  const [on, setOn] = useState<string | null>(null);
  const [other, setOther] = useState({ status: "", reason: "" });
  const [steps, setSteps] = useState<Person[]>();
  const [cleared, setCleared] = useState<string[]>([]);
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();
  // Clearing a contact's step runs apart from the close, whose transition can still be pending
  // as the list shows.
  const [isClearing, startClearing] = useTransition();

  function opening(next: boolean) {
    if (next) {
      setDay(todayIn(PLAN_TIME_ZONE));
      setOn(null);
      setOther({ status: "", reason: "" });
      setSteps(undefined);
      setCleared([]);
      setFailure(undefined);
    }
    setOpen(next);
  }

  function close(status: ClosedStatus, reason: string) {
    startTransition(async () => {
      const result = await callAction(() =>
        closeJob({ id: job.id, status, reason, ...(on !== null && { on }) }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      notify(`Closed as ${STATUS_LABELS[status]}: ${reason}.`);
      const withSteps = await contactsWithSteps(contacts);
      if (withSteps.length === 0) {
        setOpen(false);
        return;
      }
      setSteps(withSteps);
    });
  }

  function closeWithTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isClosed(other.status as JobStatus)) {
      close(other.status as ClosedStatus, other.reason.trim());
    }
  }

  function noNextStep(person: Person) {
    startClearing(async () => {
      const result = await callAction(() =>
        updatePerson({
          id: person.id,
          updatedAt: person.updatedAt.toISOString(),
          nextStep: null,
          nextDate: null,
        }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setCleared((now) => [...now, person.id]);
    });
  }

  return (
    <Sheet open={open} onOpenChange={opening}>
      {isClosed(job.status) ? null : (
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 w-fit"
            />
          }
        >
          Close…
        </SheetTrigger>
      )}
      <SheetContent side="bottom" showCloseButton={false} className={SHEET}>
        <form
          onSubmit={closeWithTyped}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>{steps ? "Closed" : "Close this job"}</SheetTitle>
            <SheetDescription>
              {steps
                ? "Its contacts still have next steps. Clear any that were about this job."
                : "Pick why. A close clears the job's next step."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
            {steps ? (
              <ul className="flex flex-col divide-y">
                {steps.map((person) => (
                  <li
                    key={person.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-bold break-words">
                        {person.name}
                      </span>
                      <span className="text-muted-foreground text-sm break-words">
                        {person.nextStep}
                        {person.nextDate
                          ? ` · ${formatDay(person.nextDate)}`
                          : ""}
                      </span>
                    </span>
                    {cleared.includes(person.id) ? (
                      <span className="text-muted-foreground text-sm">
                        Cleared
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        disabled={isClearing}
                        onClick={() => noNextStep(person)}
                        aria-label={`No next step for ${person.name}`}
                        className="min-h-11"
                      >
                        No next step
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <FormField
                  id="close-on"
                  label="Closed on"
                  kind="date"
                  value={on ?? day}
                  onChange={(value) => setOn(value || null)}
                  error={failure?.fields?.on}
                />
                {CLOSED_STATUSES.map((status) => (
                  <section key={status} className="flex flex-col gap-2">
                    <DisplayLabel className="text-muted-foreground">
                      {STATUS_LABELS[status]}
                    </DisplayLabel>
                    <div className="flex flex-wrap gap-2">
                      {CLOSE_REASONS[status].map((reason) => (
                        <Button
                          key={reason}
                          type="button"
                          variant="secondary"
                          size="lg"
                          disabled={isPending}
                          onClick={() => close(status, reason)}
                          aria-label={`${reason}: close as ${STATUS_LABELS[status].toLowerCase()}`}
                          className="min-h-11"
                        >
                          {reason}
                        </Button>
                      ))}
                    </div>
                  </section>
                ))}
                <FieldGroup>
                  <FormField
                    id="close-as"
                    label="Or close as"
                    kind={{
                      choices: CLOSED_STATUSES.map((status) => ({
                        value: status,
                        label: STATUS_LABELS[status],
                      })),
                    }}
                    value={other.status}
                    onChange={(status) =>
                      setOther((now) => ({ ...now, status }))
                    }
                    error={failure?.fields?.status}
                  />
                  <FormField
                    id="close-reason"
                    label="Another reason"
                    kind="text"
                    value={other.reason}
                    onChange={(reason) =>
                      setOther((now) => ({ ...now, reason }))
                    }
                    error={failure?.fields?.reason}
                    maxLength={200}
                  />
                </FieldGroup>
              </>
            )}
            {failure && !failure.fields ? (
              <p role="alert" className="text-destructive text-sm">
                {failure.message}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            {steps ? (
              <Button
                key="done"
                type="button"
                size="lg"
                onClick={() => setOpen(false)}
                className="min-h-11"
              >
                Done
              </Button>
            ) : (
              <Button
                key="close"
                type="submit"
                size="lg"
                disabled={isPending || !other.status || !other.reason.trim()}
                className="min-h-11"
              >
                {isPending ? "Closing…" : "Close with that reason"}
              </Button>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// What a move left next, for its toast.
function nextOf({ nextStep, nextDate }: Job): string {
  if (!nextStep) {
    return "No next step.";
  }
  return `Next: ${nextStep}${nextDate ? `, ${formatDay(nextDate)}` : ""}.`;
}

// The job's contacts whose next step is still open, read as they are now.
async function contactsWithSteps(contacts: PersonRef[]): Promise<Person[]> {
  const read = await Promise.all(
    contacts.map((contact) => callAction(() => getPerson({ id: contact.id }))),
  );
  return read.flatMap((result) =>
    result.ok && result.data.person.nextStep ? [result.data.person] : [],
  );
}
