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
import Link from "next/link";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { ConflictNotice } from "@/app/_components/conflict-notice";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import { notify } from "@/app/_lib/notify";
import { pushDays } from "@/app/_lib/push-days";
import { useRecordForm } from "@/app/_lib/use-record-form";
import { useToday } from "@/app/_lib/use-today";
import { deleteInteraction, logInteraction } from "@/app/actions/interactions";
import { getJob, updateJob } from "@/app/actions/jobs";
import { addNote, deleteNote } from "@/app/actions/notes";
import { getPerson, updatePerson } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/shared";
import { afterFollowUp, type JobStage } from "@/src/entities/job-lifecycle";
import type { InteractionKind } from "@/src/entities/models/interaction.model";
import type { PersonRef } from "@/src/entities/models/person.model";
import { addDays } from "@/src/entities/week";

// What a next step's sheet changes: a job's or a person's next step and date, read with the
// record's updatedAt.
export type NextStepRecord = {
  id: string;
  updatedAt: Date;
  nextStep: string | null;
  nextDate: string | null;
};
type NextStepField = "nextStep" | "nextDate";
type Step = Pick<NextStepRecord, NextStepField>;
type Failure = Extract<ActionResult<unknown>, { ok: false }>;
// What a Done wrote besides the step, so its Undo can take it back.
type Wrote = { interactionId?: string; noteId?: string };

const fieldsOf = (record: NextStepRecord): Record<NextStepField, string> => ({
  nextStep: record.nextStep ?? "",
  nextDate: record.nextDate ?? "",
});

function isNextStepRecord(value: unknown): value is NextStepRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "nextStep" in value &&
    "nextDate" in value &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

// What's next once a task is done, unless changed: a follow-up a week out (the UX plan's Q2).
const NEXT_STEP = "Follow up";
// What a follow-up sent through a job's portal leaves in its notes, since it names no one to log
// a message to (the UX plan's Q3).
const PORTAL_NOTE = "Followed up through the portal.";

const HOW_IT_WENT: { value: InteractionKind; label: string }[] = [
  { value: "message-sent", label: "Message sent" },
  { value: "reply-received", label: "Reply" },
  { value: "conversation", label: "Conversation held" },
];

const said = ({ nextStep, nextDate }: Step) =>
  nextStep
    ? `Next: ${nextStep}${nextDate ? `, ${formatDay(nextDate)}` : ""}.`
    : "No next step.";

// A due row's sheet (R9, the UX plan's UX3): Push moves the task to another day in one tap, and
// Done records what happened and sets what's next, so the row always leaves or moves. A person's
// Done logs how it went; a job's can log a follow-up to one of its contacts, which moves the date
// by R3, or note one sent through the portal. Each save says what changed in a toast, with Undo.
// A change is made against the updatedAt the row read (R22): on a conflict the sheet stays open on
// the record as it is now, with what was typed kept (docs/build-plan.md KTD15). The sheet is a
// form, so Enter and the phone keyboard's Go save.
export function NextStepSheet({
  kind,
  record,
  title,
  detail,
  href,
  job,
  contacts = [],
  trigger,
  children,
}: {
  kind: "job" | "person";
  record: NextStepRecord;
  // Who or what the task is for: "Role · Company", or the person's name and company.
  title: string;
  // The task and when it's due.
  detail: string;
  // The record's page, which the sheet links to.
  href: string;
  // A job's stage, for R3's follow-up rule.
  job?: Pick<JobStage, "status" | "appliedOn">;
  contacts?: PersonRef[];
  // What opens the sheet (This week's row or its pit board), and what it shows.
  trigger: ReactElement;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"push" | "done">("push");
  const form = useRecordForm(record, fieldsOf, isNextStepRecord);
  const day = useToday();
  const [another, setAnother] = useState("");
  const [how, setHow] = useState<InteractionKind>("message-sent");
  const [wrote, setWrote] = useState<Wrote>({});
  const [failure, setFailure] = useState<Failure>();
  const [isWriting, startWriting] = useTransition();
  const busy = form.isPending || isWriting;
  const shown = form.failure ?? failure;
  // R3 moves an applied job's date after a follow-up, so its Done needs no date of its own.
  const followsUp =
    kind === "job" && job?.status === "applied" && job.appliedOn;

  function opening(next: boolean) {
    if (next) {
      day.refresh();
      setView("push");
      setAnother("");
      setFailure(undefined);
    }
    setOpen(next);
  }

  function startDone() {
    form.setField("nextStep", NEXT_STEP);
    form.setField("nextDate", addDays(day.today, 7));
    setView("done");
  }

  // Saves the step and date against the updatedAt read, then closes and says what changed.
  function saveStep(
    changes: Partial<Step>,
    message: (saved: Step) => string,
    made: Wrote,
  ) {
    const before: Step = {
      nextStep: form.opened.nextStep,
      nextDate: form.opened.nextDate,
    };
    const input = {
      id: form.opened.id,
      updatedAt: form.opened.updatedAt.toISOString(),
      ...changes,
    };
    form.save(
      () => (kind === "job" ? updateJob(input) : updatePerson(input)),
      (saved: NextStepRecord) => {
        form.reopen(saved);
        setOpen(false);
        tell(message(saved), before, made);
      },
    );
  }

  // A toast that says what changed, with Undo: it takes back what was written and puts the step
  // and date back as they were.
  function tell(message: string, before: Step, made: Wrote) {
    notify(message, {
      action: { label: "Undo", onClick: () => undo(before, made) },
    });
  }

  async function undo(before: Step, made: Wrote) {
    const { interactionId, noteId } = made;
    if (interactionId) {
      await callAction(() => deleteInteraction({ id: interactionId }));
    }
    if (noteId) {
      await callAction(() => deleteNote({ id: noteId }));
    }
    const back = await putBack(before);
    notify(back ? "Put back as it was." : "Couldn't undo it.");
  }

  // The step and date as they were, against the record as it is now.
  async function putBack(before: Step): Promise<boolean> {
    if (kind === "job") {
      const now = await callAction(() => getJob({ id: record.id }));
      if (!now.ok) return false;
      const updatedAt = now.data.job.updatedAt.toISOString();
      return (
        await callAction(() =>
          updateJob({ id: record.id, updatedAt, ...before }),
        )
      ).ok;
    }
    const now = await callAction(() => getPerson({ id: record.id }));
    if (!now.ok) return false;
    const updatedAt = now.data.person.updatedAt.toISOString();
    return (
      await callAction(() =>
        updatePerson({ id: record.id, updatedAt, ...before }),
      )
    ).ok;
  }

  function push(day: string) {
    saveStep({ nextDate: day }, () => `Pushed to ${formatDay(day)}.`, {});
  }

  const whatsNext = (): Partial<Step> =>
    Object.fromEntries(
      form.edited.map((field) => [field, form.fields[field].trim() || null]),
    );

  // A person's Done: logs how it went (once, however many saves a conflict takes), then saves
  // what's next.
  function finishPerson(next: Partial<Step>) {
    startWriting(async () => {
      let { interactionId } = wrote;
      if (!interactionId) {
        const result = await callAction(() =>
          logInteraction({ personIds: [record.id], kind: how }),
        );
        if (!result.ok) {
          setFailure(result);
          return;
        }
        interactionId = result.data.interactions[0]?.id;
        setWrote({ interactionId });
      }
      const label = HOW_IT_WENT.find(({ value }) => value === how)?.label;
      saveStep(next, (saved) => `Logged: ${label}. ${said(saved)}`, {
        interactionId,
      });
    });
  }

  // A job's follow-up to one of its contacts: a sent message linked to the job, which moves an
  // applied job's date by R3. A job at another stage saves what's next too.
  function followUpTo(contact: PersonRef) {
    startWriting(async () => {
      const result = await callAction(() =>
        logInteraction({
          personIds: [contact.id],
          kind: "message-sent",
          jobId: record.id,
        }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      const made = { interactionId: result.data.interactions[0]?.id };
      setWrote(made);
      const message = `Logged a follow-up to ${contact.name}.`;
      if (followsUp && job) {
        const { nextStep, nextDate } = form.opened;
        const moved = afterFollowUp({ ...job, nextStep, nextDate }, day.today);
        setOpen(false);
        tell(`${message} ${said(moved)}`, { nextStep, nextDate }, made);
        return;
      }
      saveStep(whatsNext(), (saved) => `${message} ${said(saved)}`, made);
    });
  }

  // A follow-up sent through the job's portal names no one to log a message to, so the date moves
  // as R3 would move it and a note records it (the UX plan's Q3).
  function followUpThroughPortal() {
    startWriting(async () => {
      const result = await callAction(() =>
        addNote({ record: { kind: "job", id: record.id }, body: PORTAL_NOTE }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      const made = { noteId: result.data.id };
      setWrote(made);
      const { nextStep, nextDate } = form.opened;
      const next =
        followsUp && job
          ? {
              nextDate: afterFollowUp({ ...job, nextStep, nextDate }, day.today)
                .nextDate,
            }
          : whatsNext();
      saveStep(
        next,
        (saved) => `Noted a follow-up through the portal. ${said(saved)}`,
        made,
      );
    });
  }

  function noNextStep() {
    const none = { nextStep: null, nextDate: null };
    if (kind === "person") {
      finishPerson(none);
      return;
    }
    saveStep(none, said, {});
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view === "push") {
      if (another) push(another);
      return;
    }
    if (kind === "person") {
      finishPerson(whatsNext());
      return;
    }
    saveStep(whatsNext(), (saved) => `Saved. ${said(saved)}`, {});
  }

  return (
    <Sheet open={open} onOpenChange={opening}>
      <SheetTrigger render={trigger}>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-dvh">
        {/* Only the fields scroll, so the header and the buttons stay on screen. */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{detail}</SheetDescription>
            <Link
              href={href}
              className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline underline-offset-4"
            >
              Go to the {kind === "job" ? "job" : "person"}
            </Link>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            {form.failure?.code === "conflict" ? (
              <ConflictNotice
                what={kind === "job" ? "the job" : "the person"}
                changes={form.changes}
              />
            ) : null}
            {view === "push" ? (
              <PushPanel
                id={record.id}
                today={day.today}
                another={another}
                onAnother={setAnother}
                onPush={push}
                busy={busy}
              />
            ) : (
              <DonePanel
                id={record.id}
                kind={kind}
                today={day.today}
                how={how}
                onHow={setHow}
                contacts={contacts}
                followsUp={Boolean(followsUp)}
                onFollowUp={followUpTo}
                onPortal={followUpThroughPortal}
                fields={form.fields}
                onField={form.setField}
                errors={form.failure?.fields}
                busy={busy}
              />
            )}
            {shown && shown.code !== "conflict" && !shown.fields ? (
              <p role="alert" className="text-destructive text-sm">
                {shown.message}
              </p>
            ) : null}
          </div>
          {/* Each button keeps a key of its own. Without one, tapping Done turned the same
              element into Save during the tap, and the browser then submitted the form. */}
          <SheetFooter>
            {view === "push" ? (
              <>
                <Button
                  key="done"
                  type="button"
                  size="lg"
                  onClick={startDone}
                  disabled={busy}
                  className="min-h-11"
                >
                  Done
                </Button>
                <Button
                  key="push"
                  type="submit"
                  variant="secondary"
                  size="lg"
                  disabled={busy || !another}
                  className="min-h-11"
                >
                  Push to that day
                </Button>
              </>
            ) : (
              <>
                <Button
                  key="save"
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="min-h-11"
                >
                  {busy ? "Saving…" : "Save"}
                </Button>
                <Button
                  key="none"
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={busy}
                  onClick={noNextStep}
                  className="min-h-11"
                >
                  No next step
                </Button>
              </>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Push: a chip per day saves in one tap, and the date field takes any other day.
function PushPanel({
  id,
  today,
  another,
  onAnother,
  onPush,
  busy,
}: {
  id: string;
  today: string;
  another: string;
  onAnother: (day: string) => void;
  onPush: (day: string) => void;
  busy: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Push to</span>
        <div className="flex flex-wrap gap-2">
          {pushDays(today).map(({ label, day }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => onPush(day)}
              aria-label={`Push to ${label.toLowerCase()}, ${formatDay(day)}`}
              className="min-h-11"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <FieldGroup>
        <FormField
          id={`push-day-${id}`}
          label="Another day"
          kind="date"
          value={another}
          onChange={onAnother}
        />
      </FieldGroup>
    </>
  );
}

// Done: how it went, for a person, or a follow-up to one of a job's contacts; then what's next.
function DonePanel({
  id,
  kind,
  today,
  how,
  onHow,
  contacts,
  followsUp,
  onFollowUp,
  onPortal,
  fields,
  onField,
  errors,
  busy,
}: {
  id: string;
  kind: "job" | "person";
  today: string;
  how: InteractionKind;
  onHow: (how: InteractionKind) => void;
  contacts: PersonRef[];
  followsUp: boolean;
  onFollowUp: (contact: PersonRef) => void;
  onPortal: () => void;
  fields: Record<NextStepField, string>;
  onField: (field: NextStepField, text: string) => void;
  errors?: Partial<Record<string, string>>;
  busy: boolean;
}) {
  return (
    <FieldGroup>
      {kind === "person" ? (
        <FormField
          id={`how-${id}`}
          label="How did it go?"
          kind={{ choices: HOW_IT_WENT }}
          value={how}
          onChange={(value) => onHow(value as InteractionKind)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Follow-up sent to</span>
          <div className="flex flex-wrap gap-2">
            {contacts.map((contact) => (
              <Button
                key={contact.id}
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => onFollowUp(contact)}
                className="min-h-11"
              >
                {contact.name}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={onPortal}
              className="min-h-11"
            >
              Through the portal
            </Button>
          </div>
          {followsUp ? (
            <span className="text-muted-foreground text-sm">
              A follow-up moves the next date on its own. Or set what's next
              below.
            </span>
          ) : null}
        </div>
      )}
      <FormField
        id={`next-step-${id}`}
        label="What's next?"
        kind="long"
        value={fields.nextStep}
        onChange={(text) => onField("nextStep", text)}
        error={errors?.nextStep}
        maxLength={120}
      />
      <FormField
        id={`next-when-${id}`}
        label="When"
        kind={{
          choices: pushDays(today).map(({ label, day }) => ({
            value: day,
            label,
          })),
        }}
        value={fields.nextDate}
        onChange={(day) => onField("nextDate", day)}
      />
      <FormField
        id={`next-date-${id}`}
        label={FIELD_LABELS.nextDate ?? "Next date"}
        kind="date"
        value={fields.nextDate}
        onChange={(text) => onField("nextDate", text)}
        error={errors?.nextDate}
      />
    </FieldGroup>
  );
}
