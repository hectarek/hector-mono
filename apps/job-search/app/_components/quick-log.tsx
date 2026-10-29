"use client";

import { Button } from "@repo/ui/components/button";
import { FieldGroup } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { INTERACTION_LABELS } from "@/app/_lib/job-labels";
import { logInteraction } from "@/app/actions/interactions";
import { addPerson, findPeople } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/shared";
import type { CompanyRef } from "@/src/entities/models/company.model";
import {
  INTERACTION_KINDS,
  type InteractionKind,
} from "@/src/entities/models/interaction.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

type Picked = { id: string; name: string };
type Failure = Extract<ActionResult<unknown>, { ok: false }>;

const KINDS = INTERACTION_KINDS.map((kind) => ({
  value: kind,
  label: INTERACTION_LABELS[kind],
}));

// How many matches a search shows.
const MATCHES = 5;

// The quick log (R8, docs/build-plan.md U7): one sheet for a sent message, a reply or a held
// conversation, dated today unless changed, saved with one tap. It opens on a person from their
// page, or picks people by search, and a sent message can go to several at once. A search with no
// match offers to add the person, by name and company. Saved, the sheet closes and the page
// refreshes with the action's answer.
export function QuickLog({
  person,
  jobs = [],
  jobId = "",
  companies = [],
}: {
  // The person it opens on.
  person?: Picked;
  // The jobs it can link to: the person's, or the job it opens from.
  jobs?: { id: string; label: string }[];
  // The job it opens linked to, from the job's page. Elsewhere none is, since a sent message
  // linked to an applied job moves its follow-up (R3).
  jobId?: string;
  // The companies a new person can be at.
  companies?: CompanyRef[];
}) {
  const fresh = () => ({
    people: person ? [person] : [],
    kind: "message-sent" as InteractionKind,
    occurredOn: todayIn(PLAN_TIME_ZONE),
    jobId,
    note: "",
    nextStep: "",
    nextDate: "",
  });
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState(fresh);
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();

  // Several people only for sent messages: another kind keeps the first.
  const batch = entry.kind === "message-sent";
  const set = (changes: Partial<typeof entry>) =>
    setEntry((now) => ({ ...now, ...changes }));

  function save() {
    startTransition(async () => {
      const result = await callAction(() =>
        logInteraction({
          personIds: entry.people.map(({ id }) => id),
          kind: entry.kind,
          occurredOn: entry.occurredOn,
          ...(entry.jobId && { jobId: entry.jobId }),
          ...(entry.note.trim() && { note: entry.note }),
          ...(entry.nextStep.trim() && { nextStep: entry.nextStep }),
          ...(entry.nextDate && { nextDate: entry.nextDate }),
        }),
      );
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setFailure(undefined);
      setEntry(fresh());
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="lg" className="min-h-11" />}>
        <Plus />
        Log
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-dvh overflow-y-auto"
      >
        <SheetCloseButton />
        <SheetHeader>
          <SheetTitle>Log outreach</SheetTitle>
          <SheetDescription>
            A message sent, a reply or a conversation held, today unless you
            change the date.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <FieldGroup>
            <FormField
              id="quick-log-kind"
              label={FIELD_LABELS.kind ?? "What happened"}
              kind={{ choices: KINDS }}
              value={entry.kind}
              onChange={(kind) => {
                const next = (kind || "message-sent") as InteractionKind;
                set({
                  kind: next,
                  people:
                    next === "message-sent"
                      ? entry.people
                      : entry.people.slice(0, 1),
                });
              }}
              error={failure?.fields?.kind}
            />
            <PeoplePicker
              picked={entry.people}
              several={batch}
              companies={companies}
              onPick={(people) => set({ people })}
              error={failure?.fields?.personIds}
            />
            <FormField
              id="quick-log-date"
              label={FIELD_LABELS.occurredOn ?? "Date"}
              kind="date"
              value={entry.occurredOn}
              onChange={(occurredOn) => set({ occurredOn })}
              error={failure?.fields?.occurredOn}
            />
            {jobs.length ? (
              <FormField
                id="quick-log-job"
                label={FIELD_LABELS.jobId ?? "Job"}
                kind={{
                  choices: [
                    { value: "", label: "None" },
                    ...jobs.map(({ id, label }) => ({ value: id, label })),
                  ],
                }}
                value={entry.jobId}
                onChange={(jobId) => set({ jobId })}
                error={failure?.fields?.jobId}
              />
            ) : null}
            <FormField
              id="quick-log-note"
              label={FIELD_LABELS.note ?? "Note"}
              kind="long"
              value={entry.note}
              onChange={(note) => set({ note })}
              error={failure?.fields?.note}
              maxLength={500}
            />
            <FormField
              id="quick-log-next-step"
              label={FIELD_LABELS.nextStep ?? "Next step"}
              kind="text"
              value={entry.nextStep}
              onChange={(nextStep) => set({ nextStep })}
              error={failure?.fields?.nextStep}
              maxLength={120}
            />
            <FormField
              id="quick-log-next-date"
              label={FIELD_LABELS.nextDate ?? "Next date"}
              kind="date"
              value={entry.nextDate}
              onChange={(nextDate) => set({ nextDate })}
              error={failure?.fields?.nextDate}
            />
          </FieldGroup>
        </div>
        {failure && !failure.fields ? (
          <p role="alert" className="text-destructive px-4 text-sm">
            {failure.message}
          </p>
        ) : null}
        <SheetFooter>
          <Button
            size="lg"
            disabled={isPending || entry.people.length === 0}
            onClick={save}
            className="min-h-11"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Who the log is for: the people picked so far, and a search by name for more (or the first).
// A search with no match offers to add the person.
function PeoplePicker({
  picked,
  several,
  companies,
  onPick,
  error,
}: {
  picked: Picked[];
  several: boolean;
  companies: CompanyRef[];
  onPick: (people: Picked[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Picked[]>([]);
  const [adding, setAdding] = useState<string>();
  const searching = several || picked.length === 0;

  useEffect(() => {
    const name = query.trim();
    if (!name) {
      setMatches([]);
      return;
    }
    // A pause in typing, then one search: each keystroke doesn't call the server.
    const timer = setTimeout(async () => {
      const result = await callAction(() =>
        findPeople({ query: name, limit: MATCHES }),
      );
      setMatches(result.ok ? result.data.people : []);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (person: Picked) => {
    onPick(several ? [...picked, person] : [person]);
    setQuery("");
    setMatches([]);
    setAdding(undefined);
  };
  const unpicked = matches.filter(
    ({ id }) => !picked.some((person) => person.id === id),
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{FIELD_LABELS.personIds}</span>
      {picked.length ? (
        <ul className="flex flex-wrap gap-2">
          {picked.map((person) => (
            <li key={person.id}>
              <Button
                variant="secondary"
                size="lg"
                onClick={() =>
                  onPick(picked.filter(({ id }) => id !== person.id))
                }
                aria-label={`Remove ${person.name}`}
                className="min-h-11"
              >
                {person.name}
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {searching ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={picked.length ? "Add someone else" : "Search by name"}
          aria-label="Search people by name"
          className="min-h-11"
        />
      ) : null}
      {unpicked.length ? (
        <ul className="flex flex-col gap-1">
          {unpicked.map((person) => (
            <li key={person.id}>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => pick(person)}
                className="min-h-11 w-full justify-start"
              >
                {person.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() && !matches.length && adding === undefined ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setAdding(query.trim())}
          className="min-h-11 w-fit"
        >
          <Plus />
          Add “{query.trim()}”
        </Button>
      ) : null}
      {adding !== undefined ? (
        <AddPerson
          name={adding}
          companies={companies}
          onAdded={pick}
          onCancel={() => setAdding(undefined)}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Adding someone from the sheet: only a name and, if there is one, a company already listed.
function AddPerson({
  name: initial,
  companies,
  onAdded,
  onCancel,
}: {
  name: string;
  companies: CompanyRef[];
  onAdded: (person: Picked) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function add() {
    const typed = company.trim().toLowerCase();
    const companyId = typed
      ? companies.find((listed) => listed.name.toLowerCase() === typed)?.id
      : undefined;
    if (typed && !companyId) {
      setError("Pick a company from the list, or add it first.");
      return;
    }
    startTransition(async () => {
      const result = await callAction(() =>
        addPerson({ name, ...(companyId && { companyId }) }),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onAdded({ id: result.data.id, name: result.data.name });
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="New person's name"
        maxLength={120}
        className="min-h-11"
      />
      <Input
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        placeholder="Company (optional)"
        aria-label="New person's company"
        list="quick-log-companies"
        className="min-h-11"
      />
      <datalist id="quick-log-companies">
        {companies.map(({ id, name: listed }) => (
          <option key={id} value={listed} />
        ))}
      </datalist>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          disabled={isPending}
          onClick={add}
          className="min-h-11"
        >
          {isPending ? "Adding…" : "Add person"}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={onCancel}
          className="min-h-11"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
