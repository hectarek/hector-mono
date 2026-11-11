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
import { ChevronDown, Plus, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import { FormField } from "@/app/_components/form-field";
import { SheetCloseButton } from "@/app/_components/sheet-close-button";
import { callAction } from "@/app/_lib/call-action";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { INTERACTION_LABELS } from "@/app/_lib/job-labels";
import { minutesAfter, momentOf } from "@/app/_lib/local-time";
import { notify } from "@/app/_lib/notify";
import { useToday } from "@/app/_lib/use-today";
import { findCompanies } from "@/app/actions/companies";
import { deleteInteraction, logInteraction } from "@/app/actions/interactions";
import { addPerson, findPeople, getPerson } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/shared";
import {
  COMPANY_PAGE_MAX,
  type CompanyRef,
  companyNameKey,
} from "@/src/entities/models/company.model";
import {
  INTERACTION_KINDS,
  type Interaction,
  type InteractionKind,
} from "@/src/entities/models/interaction.model";
import type { JobSummary } from "@/src/entities/models/job.model";
import type {
  PersonRef,
  PersonSummary,
} from "@/src/entities/models/person.model";

type Picked = { id: string; name: string };
type JobChoice = { id: string; label: string };
type Failure = Extract<ActionResult<unknown>, { ok: false }>;

// What the sheet holds until it's saved.
type Entry = {
  people: Picked[];
  kind: InteractionKind;
  // A conversation still to come, logged with its start and end (datetime-local values).
  ahead: boolean;
  startsAt: string;
  endsAt: string;
  // The day it happened: null until changed, which logs it on the day it's saved.
  occurredOn: string | null;
  jobId: string;
  note: string;
  nextStep: string;
  nextDate: string;
};

const KINDS = INTERACTION_KINDS.map((kind) => ({
  value: kind,
  label: INTERACTION_LABELS[kind],
}));

// A conversation is held, or still to come and logged ahead with its start and end, so it reaches
// Today's debriefs once it ends (R9).
const WHEN = [
  { value: "held", label: "Held" },
  { value: "ahead", label: "Coming up" },
];

// How long a conversation still to come lasts unless its end is changed.
const MEETING_MINUTES = 30;

// The fields More folds away, so what happened, who and Save fit a phone's first screen.
const MORE_FIELDS = ["occurredOn", "note", "nextStep", "nextDate"] as const;

// How many people, and how many companies, a search suggests.
const MATCHES = 5;
const COMPANY_MATCHES = 8;

// A match's row: the whole row picks the person.
const MATCH =
  "hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2";

// The quick log (R8, docs/build-plan.md U7, the UX plan's UX5): one sheet for a sent message, a
// reply or a conversation, held or still to come, dated today unless changed, saved with one tap.
// The shell's top bar opens it on every page; a person's page opens it on them, and a job's page
// linked to the job, with its contacts a tap away. The search finds people by name or company, and
// a picked person's jobs can be linked. A sent message can go to several people at once, and a
// search with no match offers to add the person. The sheet is a form, so Enter and the phone
// keyboard's Go save; saved, it closes, and a toast says what was logged.
export function QuickLog({
  person,
  jobs = [],
  jobId = "",
  contacts = [],
}: {
  // The person it opens on.
  person?: Picked;
  // The jobs it can link to from the page: the person's, or the job it opens from.
  jobs?: JobChoice[];
  // The job it opens linked to, from the job's page. Elsewhere none is, since a sent message
  // linked to an applied job moves its follow-up (R3).
  jobId?: string;
  // The people it offers in one tap: a job's contacts, from its page.
  contacts?: PersonRef[];
}) {
  const fresh = (): Entry => ({
    people: person ? [person] : [],
    kind: "message-sent",
    ahead: false,
    startsAt: "",
    endsAt: "",
    occurredOn: null,
    jobId,
    note: "",
    nextStep: "",
    nextDate: "",
  });
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState(fresh);
  const [more, setMore] = useState(false);
  // The jobs each person picked here is a contact for, read once they're picked.
  const [jobsOf, setJobsOf] = useState<Record<string, JobChoice[]>>({});
  // Today, read when the sheet opens: the shell's log is prerendered with the page's frame.
  const day = useToday("");
  const [failure, setFailure] = useState<Failure>();
  const [isPending, startTransition] = useTransition();

  const set = (changes: Partial<Entry>) =>
    setEntry((now) => ({ ...now, ...changes }));
  // Several people only for sent messages: another kind keeps the first.
  const batch = entry.kind === "message-sent";
  const ahead = entry.kind === "conversation" && entry.ahead;
  const ready =
    entry.people.length > 0 &&
    (!ahead || (entry.startsAt !== "" && entry.endsAt !== ""));
  const jobChoices = offeredJobs(jobs, entry.people, jobsOf);
  const triggerName = person
    ? `Log outreach with ${person.name}`
    : jobId
      ? "Log outreach for this job"
      : "Log outreach";

  // Picks who the log is for, reading the jobs of anyone new so they can be linked. A linked job
  // that no one picked is a contact for any more is unlinked.
  function pickPeople(people: Picked[]) {
    const offered = offeredJobs(jobs, people, jobsOf);
    const unlink =
      entry.jobId !== "" && !offered.some(({ id }) => id === entry.jobId);
    set({ people, ...(unlink && { jobId: "" }) });
    for (const { id } of people) {
      if (id !== person?.id && !(id in jobsOf)) readJobs(id);
    }
  }

  async function readJobs(id: string) {
    const result = await callAction(() => getPerson({ id }));
    if (!result.ok) return;
    const read = result.data.jobs.map(jobChoice);
    setJobsOf((now) => ({ ...now, [id]: read }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || isPending) return;
    const sent = entry;
    startTransition(async () => {
      const result = await callAction(() =>
        logInteraction({
          personIds: sent.people.map(({ id }) => id),
          kind: sent.kind,
          ...(ahead
            ? {
                scheduled: {
                  startsAt: momentOf(sent.startsAt),
                  endsAt: momentOf(sent.endsAt),
                },
              }
            : sent.occurredOn !== null && { occurredOn: sent.occurredOn }),
          ...(sent.jobId && { jobId: sent.jobId }),
          ...(sent.note.trim() && { note: sent.note }),
          ...(sent.nextStep.trim() && { nextStep: sent.nextStep }),
          ...(sent.nextDate && { nextDate: sent.nextDate }),
        }),
      );
      if (!result.ok) {
        setFailure(result);
        // A field under More that the answer names opens it.
        if (MORE_FIELDS.some((field) => result.fields?.[field])) setMore(true);
        return;
      }
      setFailure(undefined);
      setEntry(fresh());
      setMore(false);
      setOpen(false);
      tell(sent, result.data.interactions);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(opening) => {
        if (opening) day.refresh();
        setOpen(opening);
      }}
    >
      <SheetTrigger
        render={
          <Button size="lg" aria-label={triggerName} className="min-h-11" />
        }
      >
        <Plus />
        Log
      </SheetTrigger>
      {/* On a laptop the sheet stops at a reading width. */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-dvh w-full max-w-xl"
      >
        {/* Only the fields scroll, so the header and Save stay on screen. */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetCloseButton />
          <SheetHeader className="mr-10">
            <SheetTitle>Log outreach</SheetTitle>
            <SheetDescription>
              {ahead
                ? "A conversation coming up, dated by its start. Once it ends, Today asks how it went."
                : "A message sent, a reply or a conversation. It's dated today unless you change the date under More."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            <FieldGroup>
              <FormField
                id="quick-log-kind"
                label={FIELD_LABELS.kind ?? "What happened"}
                kind={{ choices: KINDS }}
                value={entry.kind}
                onChange={(kind) => {
                  const next = kind as InteractionKind;
                  set({ kind: next });
                  if (next !== "message-sent") {
                    pickPeople(entry.people.slice(0, 1));
                  }
                }}
                error={failure?.fields?.kind}
              />
              {entry.kind === "conversation" ? (
                <FormField
                  id="quick-log-when"
                  label="When"
                  kind={{ choices: WHEN }}
                  value={entry.ahead ? "ahead" : "held"}
                  onChange={(when) => set({ ahead: when === "ahead" })}
                />
              ) : null}
              {ahead ? (
                <>
                  <FormField
                    id="quick-log-starts"
                    label="Starts"
                    kind="datetime"
                    value={entry.startsAt}
                    onChange={(startsAt) =>
                      set({
                        startsAt,
                        // The end follows the start until it's set after it.
                        ...(startsAt &&
                          (!entry.endsAt || entry.endsAt <= startsAt) && {
                            endsAt: minutesAfter(startsAt, MEETING_MINUTES),
                          }),
                      })
                    }
                    error={failure?.fields?.startsAt}
                    required
                  />
                  <FormField
                    id="quick-log-ends"
                    label="Ends"
                    kind="datetime"
                    value={entry.endsAt}
                    onChange={(endsAt) => set({ endsAt })}
                    // The order is checked on `scheduled`, a time that won't read on its own field.
                    error={
                      failure?.fields?.scheduled ?? failure?.fields?.endsAt
                    }
                    required
                  />
                </>
              ) : null}
              <PeoplePicker
                picked={entry.people}
                several={batch}
                contacts={contacts}
                onPick={pickPeople}
                error={failure?.fields?.personIds}
              />
              {jobChoices.length ? (
                <FormField
                  id="quick-log-job"
                  label={FIELD_LABELS.jobId ?? "Job"}
                  kind={{
                    choices: [
                      { value: "", label: "None" },
                      ...jobChoices.map(({ id, label }) => ({
                        value: id,
                        label,
                      })),
                    ],
                    stacked: true,
                  }}
                  value={entry.jobId}
                  onChange={(jobId) => set({ jobId })}
                  description={
                    batch
                      ? "A message linked to an applied job moves its follow-up."
                      : undefined
                  }
                  error={failure?.fields?.jobId}
                />
              ) : null}
            </FieldGroup>
            <div className="flex flex-col gap-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                aria-expanded={more}
                onClick={() => setMore(!more)}
                className="min-h-11 w-fit"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={more ? "rotate-180" : undefined}
                />
                More: {ahead ? "note, next step" : "date, note, next step"}
              </Button>
              {more ? (
                <FieldGroup>
                  {/* A conversation still to come is dated by its start. */}
                  {ahead ? null : (
                    <FormField
                      id="quick-log-date"
                      label={FIELD_LABELS.occurredOn ?? "Date"}
                      kind="date"
                      value={entry.occurredOn ?? day.today}
                      onChange={(occurredOn) => set({ occurredOn })}
                      error={failure?.fields?.occurredOn}
                    />
                  )}
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
                    description="Left empty with a step, it's due a week from today"
                    value={entry.nextDate}
                    onChange={(nextDate) => set({ nextDate })}
                    error={failure?.fields?.nextDate}
                  />
                </FieldGroup>
              ) : null}
            </div>
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
              disabled={isPending || !ready}
              className="min-h-11"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Who the log is for: the people picked so far, a job's contacts in one tap, and a search by name
// or company for anyone else. A search with no match offers to add the person.
function PeoplePicker({
  picked,
  several,
  contacts,
  onPick,
  error,
}: {
  picked: Picked[];
  several: boolean;
  contacts: PersonRef[];
  onPick: (people: Picked[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PersonSummary[]>([]);
  // The search the matches answer, so Add shows only once a search has found no one, never while
  // it's still on its way.
  const [answered, setAnswered] = useState("");
  const [adding, setAdding] = useState<string>();
  const searching = several || picked.length === 0;
  const typed = query.trim();

  useEffect(() => {
    if (!typed) {
      setMatches([]);
      return;
    }
    // A pause in typing, then one search: each keystroke doesn't call the server.
    const timer = setTimeout(async () => {
      const result = await callAction(() =>
        findPeople({ query: typed, limit: MATCHES }),
      );
      setMatches(result.ok ? result.data.people : []);
      setAnswered(typed);
    }, 250);
    return () => clearTimeout(timer);
  }, [typed]);

  const pick = ({ id, name }: Picked) => {
    onPick(several ? [...picked, { id, name }] : [{ id, name }]);
    setQuery("");
    setMatches([]);
    setAdding(undefined);
  };
  const isPicked = ({ id }: { id: string }) =>
    picked.some((person) => person.id === id);
  const unpicked = matches.filter((match) => !isPicked(match));
  const offered = searching
    ? contacts.filter((contact) => !isPicked(contact))
    : [];

  // Enter in the search picks the first match, rather than saving the log.
  function pickFirst(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !typed) return;
    event.preventDefault();
    const first = unpicked[0];
    if (first) pick(first);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{FIELD_LABELS.personIds}</span>
      {picked.length ? (
        <ul className="flex flex-wrap gap-2">
          {picked.map((person) => (
            <li key={person.id}>
              <Button
                type="button"
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
      {offered.length ? (
        <ul aria-label="The job's contacts" className="flex flex-wrap gap-2">
          {offered.map((contact) => (
            <li key={contact.id}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => pick(contact)}
                className="min-h-11"
              >
                <Plus />
                {contact.name}
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
          onKeyDown={pickFirst}
          placeholder={
            picked.length ? "Add someone else" : "Search by name or company"
          }
          aria-label="Search people by name or company"
          className="min-h-11"
        />
      ) : null}
      {unpicked.length ? (
        <ul className="flex flex-col gap-1">
          {unpicked.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => pick(match)}
                className={MATCH}
              >
                <span className="font-medium break-words">{match.name}</span>
                {whereFrom(match) ? (
                  <span className="text-muted-foreground text-sm break-words">
                    {whereFrom(match)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {typed &&
      answered === typed &&
      !matches.length &&
      adding === undefined ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => setAdding(typed)}
          className="min-h-11 w-fit"
        >
          <Plus />
          Add “{typed}”
        </Button>
      ) : null}
      {adding !== undefined ? (
        <AddPerson
          name={adding}
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

// Adding someone from the sheet: only a name and, if there is one, a company already listed. The
// company field suggests companies as it's typed, so no page reads them all for the log.
function AddPerson({
  name: initial,
  onAdded,
  onCancel,
}: {
  name: string;
  onAdded: (person: Picked) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [company, setCompany] = useState("");
  const [suggested, setSuggested] = useState<CompanyRef[]>([]);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const typed = company.trim();
    if (!typed) {
      setSuggested([]);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await callAction(() =>
        findCompanies({ query: typed, limit: COMPANY_MATCHES }),
      );
      setSuggested(result.ok ? result.data.companies : []);
    }, 250);
    return () => clearTimeout(timer);
  }, [company]);

  function add() {
    startTransition(async () => {
      const typed = company.trim();
      const listed = typed ? await companyNamed(typed) : undefined;
      if (listed && "error" in listed) {
        setError(listed.error);
        return;
      }
      const result = await callAction(() =>
        addPerson({ name, ...(listed && { companyId: listed.id }) }),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onAdded({ id: result.data.id, name: result.data.name });
    });
  }

  // Enter in either field adds the person, rather than saving the log.
  function addOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={addOnEnter}
        aria-label="New person's name"
        maxLength={120}
        className="min-h-11"
      />
      <Input
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        onKeyDown={addOnEnter}
        placeholder="Company (optional)"
        aria-label="New person's company"
        list="quick-log-companies"
        className="min-h-11"
      />
      <datalist id="quick-log-companies">
        {suggested.map(({ id, name: listed }) => (
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
          type="button"
          size="lg"
          disabled={isPending}
          onClick={add}
          className="min-h-11"
        >
          {isPending ? "Adding…" : "Add person"}
        </Button>
        <Button
          type="button"
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

// The listed company a typed name names, compared as companies compare (case and punctuation
// ignored), or why there's none.
async function companyNamed(
  typed: string,
): Promise<{ id: string } | { error: string }> {
  const result = await callAction(() =>
    findCompanies({ query: typed, limit: COMPANY_PAGE_MAX }),
  );
  if (!result.ok) return { error: result.message };
  const key = companyNameKey(typed);
  const found = result.data.companies.find(
    ({ name }) => companyNameKey(name) === key,
  );
  return found
    ? { id: found.id }
    : { error: "Pick a company from the list, or add it first." };
}

// The jobs the log can link to: the page's, then those of each person picked, once each.
function offeredJobs(
  jobs: JobChoice[],
  people: Picked[],
  jobsOf: Record<string, JobChoice[]>,
): JobChoice[] {
  const all = [...jobs, ...people.flatMap(({ id }) => jobsOf[id] ?? [])];
  return all.filter(
    (job, index) => all.findIndex(({ id }) => id === job.id) === index,
  );
}

const jobChoice = (job: JobSummary): JobChoice => ({
  id: job.id,
  label: `${job.role} at ${job.company.name}`,
});

// A match's role and company, which tell two people of one name apart.
const whereFrom = ({ role, company }: PersonSummary) =>
  [role, company?.name].filter(Boolean).join(" · ");

// What a log says it did, with Undo when deleting what it logged takes it all back. A log that
// linked a job or set a next step changed more than its interactions (R3 may have moved the
// job's date), so it offers no Undo; the person's page can still delete the interaction.
function tell(sent: Entry, logged: Interaction[]) {
  const who = sent.people.map(({ name }) => name).join(", ");
  const message = `Logged: ${whatHappened(sent)} · ${who}.`;
  const onlyLogged = !sent.jobId && !sent.nextStep.trim() && !sent.nextDate;
  notify(
    message,
    onlyLogged
      ? { action: { label: "Undo", onClick: () => undo(logged) } }
      : undefined,
  );
}

async function undo(logged: Interaction[]) {
  const results = await Promise.all(
    logged.map(({ id }) => callAction(() => deleteInteraction({ id }))),
  );
  notify(
    results.every(({ ok }) => ok) ? "Put back as it was." : "Couldn't undo it.",
  );
}

function whatHappened({ kind, ahead }: Entry): string {
  if (kind !== "conversation") return INTERACTION_LABELS[kind];
  return ahead ? "Conversation coming up" : "Conversation held";
}
