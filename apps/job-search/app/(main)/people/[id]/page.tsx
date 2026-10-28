import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/app/_components/delete-button";
import { JobList } from "@/app/_components/job-list";
import { OnlyHector } from "@/app/_components/only-hector";
import { QuickLog } from "@/app/_components/quick-log";
import { RecordHistory } from "@/app/_components/record-history";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import { CONVERSATION_LABELS, INTERACTION_LABELS } from "@/app/_lib/job-labels";
import { listCompanies } from "@/app/_lib/list-companies";
import { loadPerson } from "@/app/_lib/load-person";
import { deleteInteraction } from "@/app/actions/interactions";
import { deletePerson } from "@/app/actions/people";
import type { Interaction } from "@/src/entities/models/interaction.model";
import type { JobSummary } from "@/src/entities/models/job.model";
import type { Person } from "@/src/entities/models/person.model";

// The dates a person's interactions give them (KTD9), in the order outreach goes.
const DATES = [
  ["messagedOn", "Messaged"],
  ["repliedOn", "Replied"],
  ["metOn", "Met"],
] as const;

// The facts the page lists, in order; notes have their own section.
const FACTS = ["role", "howKnown", "ask"] as const;

// A person (R7): their facts, the dates their interactions give them, their interactions, the
// latest first, the jobs they're a contact for, and their history (R19). The quick log opens on
// them. Claude's session sees what only Hector may do off (KTD3).
export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const [{ person, interactions, jobs }, companies] = await Promise.all([
    loadPerson(id, actor),
    listCompanies(actor),
  ]);
  const human = actor.actor === "owner";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/people"
          className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          People
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {person.name}
              </h1>
              {person.rank ? (
                <Badge variant="secondary">{person.rank}</Badge>
              ) : null}
            </div>
            {person.company ? (
              <Link
                href={`/companies/${person.company.id}`}
                className="text-muted-foreground w-fit text-sm underline underline-offset-4"
              >
                {person.company.name}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuickLog
              person={{ id: person.id, name: person.name }}
              jobs={jobs.map((job) => ({ id: job.id, label: jobLabel(job) }))}
              companies={companies}
            />
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/people/${person.id}/edit`} />}
              className="min-h-11"
            >
              Edit
            </Button>
            {human ? (
              <DeleteButton
                what={person.name}
                action={deletePerson.bind(null, { id: person.id })}
                then="/people"
              />
            ) : (
              <OnlyHector labels={["Delete"]} />
            )}
          </div>
        </div>
      </div>

      <section aria-labelledby="person-facts" className="flex flex-col gap-2">
        <h2 id="person-facts" className="font-semibold">
          Facts
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {FACTS.map((fact) => (
            <Row key={fact} label={FIELD_LABELS[fact] ?? fact}>
              {person[fact] ?? <None />}
            </Row>
          ))}
          <Row label="Next">
            <NextStep person={person} />
          </Row>
          {DATES.map(([date, label]) => (
            <Row key={date} label={label}>
              {person[date] ? formatDay(person[date]) : <None />}
            </Row>
          ))}
        </dl>
      </section>

      {person.notes ? (
        <section aria-labelledby="person-notes" className="flex flex-col gap-2">
          <h2 id="person-notes" className="font-semibold">
            Notes
          </h2>
          <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="person-interactions"
        className="flex flex-col gap-2"
      >
        <h2 id="person-interactions" className="font-semibold">
          Interactions
        </h2>
        {interactions.length ? (
          <ul className="flex flex-col gap-3">
            {interactions.map((interaction) => (
              <li
                key={interaction.id}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <InteractionLine interaction={interaction} jobs={jobs} />
                {human ? (
                  <DeleteButton
                    what="this interaction"
                    action={deleteInteraction.bind(null, {
                      id: interaction.id,
                    })}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nothing logged yet. Log a message, a reply or a conversation.
          </p>
        )}
      </section>

      <section aria-labelledby="person-jobs" className="flex flex-col gap-2">
        <h2 id="person-jobs" className="font-semibold">
          Jobs
        </h2>
        {jobs.length ? (
          <JobList jobs={jobs} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Not a contact for any job yet.
          </p>
        )}
      </section>

      <RecordHistory record={{ kind: "person", id: person.id }} />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-6">
      <dt className="text-muted-foreground shrink-0 sm:w-36">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function None() {
  return <span className="text-muted-foreground">—</span>;
}

function NextStep({ person }: { person: Person }) {
  if (!person.nextStep && !person.nextDate) {
    return <None />;
  }
  return [person.nextStep, person.nextDate && formatDay(person.nextDate)]
    .filter(Boolean)
    .join(" · ");
}

// A job as the quick log and an interaction name it.
function jobLabel(job: JobSummary): string {
  return `${job.role} at ${job.company.name}`;
}

// One interaction: what happened and when, a conversation's state, its job and its note, as plain
// text (docs/build-plan.md KTD21).
function InteractionLine({
  interaction,
  jobs,
}: {
  interaction: Interaction;
  jobs: JobSummary[];
}) {
  const job = jobs.find(({ id }) => id === interaction.jobId);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
      <span className="font-medium">
        {INTERACTION_LABELS[interaction.kind]}
        {interaction.state && interaction.state !== "held"
          ? ` · ${CONVERSATION_LABELS[interaction.state]}`
          : null}
        <span className="text-muted-foreground font-normal">
          {" "}
          · {formatDay(interaction.occurredOn)}
        </span>
      </span>
      {job ? (
        <Link
          href={`/jobs/${job.id}`}
          className="text-muted-foreground w-fit underline underline-offset-4"
        >
          {jobLabel(job)}
        </Link>
      ) : null}
      {interaction.note ? (
        <span className="whitespace-pre-wrap break-words">
          {interaction.note}
        </span>
      ) : null}
    </div>
  );
}
