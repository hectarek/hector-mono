import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { DeleteButton } from "@/app/_components/delete-button";
import { SectionTitle } from "@/app/_components/display";
import { JobList } from "@/app/_components/job-list";
import { OnlyHector } from "@/app/_components/only-hector";
import { QuickLog } from "@/app/_components/quick-log";
import { factsLine, RecordHeader } from "@/app/_components/record-header";
import { RecordHistory } from "@/app/_components/record-history";
import { RecordNext } from "@/app/_components/record-next";
import { backTo, withFrom } from "@/app/_lib/back-link";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import { CONVERSATION_LABELS, INTERACTION_LABELS } from "@/app/_lib/job-labels";
import { loadPerson } from "@/app/_lib/load-person";
import { deleteInteraction } from "@/app/actions/interactions";
import { deletePerson } from "@/app/actions/people";
import type { Interaction } from "@/src/entities/models/interaction.model";
import type { JobSummary } from "@/src/entities/models/job.model";
import type { Person } from "@/src/entities/models/person.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// The facts the page lists, in order, then the dates a person's interactions give them (KTD9);
// what's next and their notes have sections of their own.
const FACTS = ["ask"] as const;
const DATES = [
  ["messagedOn", "Messaged"],
  ["repliedOn", "Replied"],
  ["metOn", "Met"],
] as const;

// A person (R7), in the order every record's page takes (the UX plan's UX8): their header (who
// added them, role, company and how Hector knows them, rank, and actions); what's next; their
// interactions, the latest first, each with its note; the jobs they're a contact for; their notes;
// their facts, the filled ones first; and their history (R19). The quick log opens on them.
// Claude's session sees what only Hector may do off (KTD3).
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const back = backTo((await searchParams).from, {
    href: "/people",
    label: "People",
  });
  // Where this page sends the records it links to back to.
  const here = `/people/${id}`;
  const { person, interactions, jobs, added } = await loadPerson(id, actor);
  // The clock after the session (Cache Components): today in Eastern time (KTD18).
  const today = todayIn(PLAN_TIME_ZONE);
  const human = actor.actor === "owner";
  const facts = factsOf(person);
  const filled = facts.filter(([, value]) => value !== null);
  const empty = facts.filter(([, value]) => value === null);
  const about = factsLine([person.role, person.howKnown]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BackLink back={back} />
        <RecordHeader
          kind="Person"
          added={added}
          name={person.name}
          facts={
            person.company || about ? (
              <>
                {person.company ? (
                  <Link
                    href={withFrom(`/companies/${person.company.id}`, here)}
                    className="underline underline-offset-4"
                  >
                    {person.company.name}
                  </Link>
                ) : null}
                {person.company && about ? " · " : null}
                {about}
              </>
            ) : undefined
          }
          status={
            person.rank ? (
              <Badge variant="secondary">Rank {person.rank}</Badge>
            ) : undefined
          }
          actions={
            <>
              <QuickLog
                person={{ id: person.id, name: person.name }}
                jobs={jobs.map((job) => ({
                  id: job.id,
                  label: jobLabel(job),
                }))}
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
            </>
          }
        />
      </div>

      <RecordNext
        kind="person"
        record={person}
        title={factsLine([person.name, person.company?.name])}
        href={`/people/${person.id}`}
        today={today}
      />

      <section
        aria-labelledby="person-interactions"
        className="flex flex-col gap-2"
      >
        <SectionTitle id="person-interactions">Interactions</SectionTitle>
        {interactions.length ? (
          <ul className="flex flex-col divide-y">
            {interactions.map((interaction) => (
              <li
                key={interaction.id}
                className="flex flex-wrap items-start justify-between gap-2 py-2"
              >
                <InteractionLine
                  interaction={interaction}
                  jobs={jobs}
                  from={here}
                />
                {human ? (
                  <DeleteButton
                    what="this interaction"
                    action={deleteInteraction.bind(null, {
                      id: interaction.id,
                    })}
                    quiet
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
        <SectionTitle id="person-jobs">Jobs</SectionTitle>
        {jobs.length ? (
          <JobList jobs={jobs} from={here} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Not a contact for any job yet.
          </p>
        )}
      </section>

      {person.notes ? (
        <section aria-labelledby="person-notes" className="flex flex-col gap-2">
          <SectionTitle id="person-notes">Notes</SectionTitle>
          <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
        </section>
      ) : null}

      <section aria-labelledby="person-facts" className="flex flex-col gap-2">
        <SectionTitle id="person-facts">Facts</SectionTitle>
        <dl className="flex flex-col gap-2 text-sm">
          {filled.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-6"
            >
              <dt className="text-muted-foreground shrink-0 sm:w-36">
                {label}
              </dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {empty.length ? (
          <p className="text-muted-foreground text-sm">
            Not set: {empty.map(([label]) => label).join(", ")}
          </p>
        ) : null}
      </section>

      <RecordHistory record={{ kind: "person", id: person.id }} />
    </div>
  );
}

// The person's facts as the page lists them, each by its label, and none as null.
function factsOf(person: Person): [string, string | null][] {
  return [
    ...FACTS.map((fact): [string, string | null] => [
      FIELD_LABELS[fact] ?? fact,
      person[fact],
    ]),
    ...DATES.map(([date, label]): [string, string | null] => [
      label,
      person[date] ? formatDay(person[date]) : null,
    ]),
  ];
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
  from,
}: {
  interaction: Interaction;
  jobs: JobSummary[];
  from: string;
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
          href={withFrom(`/jobs/${job.id}`, from)}
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
