import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/app/_components/back-link";
import { ContactList } from "@/app/_components/contact-list";
import { DeleteButton } from "@/app/_components/delete-button";
import { SectionTitle } from "@/app/_components/display";
import { DriverCode } from "@/app/_components/driver-code";
import { NotForMe } from "@/app/_components/not-for-me";
import { OnlyHector } from "@/app/_components/only-hector";
import { PinButton } from "@/app/_components/pin-button";
import { QuickLog } from "@/app/_components/quick-log";
import { factsLine, RecordHeader } from "@/app/_components/record-header";
import { RecordHistory } from "@/app/_components/record-history";
import { RecordNext } from "@/app/_components/record-next";
import { RecordNotes } from "@/app/_components/record-notes";
import { RemoveContactButton } from "@/app/_components/remove-contact-button";
import { StageControl } from "@/app/_components/stage-control";
import { StatusChip } from "@/app/_components/status-chip";
import { backTo, withFrom } from "@/app/_lib/back-link";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import { payBand } from "@/app/_lib/format-pay";
import {
  CONVERSATION_LABELS,
  EMPLOYMENT_LABELS,
  INTERACTION_LABELS,
  LEVEL_LABELS,
  STATUS_LABELS,
  WORK_MODE_LABELS,
} from "@/app/_lib/job-labels";
import { loadJob } from "@/app/_lib/load-job";
import { deleteJob } from "@/app/actions/jobs";
import { isStaleCandidate } from "@/src/entities/job-lifecycle";
import type { Job, JobOutreach } from "@/src/entities/models/job.model";
import { isToApply } from "@/src/entities/rank";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// A job (R1), in the order every record's page takes (the UX plan's UX8): its header (who added
// it, its key facts, its status and actions, with Pin and Not for me while it's on the ranked
// list, R27); what's next; its contacts and outreach; its notes; its facts, the filled ones first;
// its stage, with its moves (R2, R3); and its history (R19). Claude's session sees what only
// Hector may do off (KTD3).
export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const back = backTo((await searchParams).from, {
    href: "/jobs",
    label: "Jobs",
  });
  // Where this page sends the records it links to back to.
  const here = `/jobs/${id}`;
  const { job, notes, moves, contacts, repliedOn, added, outreach } =
    await loadJob(id, actor);
  // The clock after the session (Cache Components): today in Eastern time (KTD18).
  const today = todayIn(PLAN_TIME_ZONE);
  const human = actor.actor === "owner";
  const toApply = isToApply(job.status);
  const facts = factsOf(job);
  const filled = facts.filter(([, value]) => value !== null);
  const empty = facts.filter(([, value]) => value === null);
  const headline = factsLine([
    job.location,
    job.workMode && WORK_MODE_LABELS[job.workMode],
    job.level && LEVEL_LABELS[job.level],
    payBand(job),
    `via ${job.source.name}`,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BackLink back={back} />
        <RecordHeader
          kind="Job"
          added={added}
          name={job.role}
          facts={
            <>
              <Link
                href={withFrom(`/companies/${job.company.id}`, here)}
                className="underline underline-offset-4"
              >
                {job.company.name}
              </Link>
              {job.clientName ? `, for ${job.clientName}` : null}
              {headline ? ` · ${headline}` : null}
            </>
          }
          status={
            <>
              <StatusChip
                status={job.status}
                applied={job.appliedOn !== null}
              />
              {toApply && job.pinnedAt ? (
                <Badge variant="outline">Pinned</Badge>
              ) : null}
              {job.company.tier ? (
                <Badge variant="outline">Tier {job.company.tier}</Badge>
              ) : null}
            </>
          }
          actions={
            <>
              <Button
                variant="secondary"
                size="lg"
                nativeButton={false}
                render={<Link href={`/jobs/${job.id}/edit`} />}
                className="min-h-11"
              >
                Edit
              </Button>
              {toApply ? (
                <>
                  <PinButton job={job} />
                  <NotForMe job={job} human={human} />
                </>
              ) : null}
              {human ? (
                <DeleteButton
                  what={job.role}
                  action={deleteJob.bind(null, { id: job.id })}
                  then="/jobs"
                />
              ) : (
                <OnlyHector labels={["Delete"]} />
              )}
            </>
          }
        />
      </div>

      <RecordNext
        kind="job"
        record={job}
        title={factsLine([job.role, job.company.name])}
        href={`/jobs/${job.id}`}
        today={today}
        contacts={contacts}
      />

      <section aria-labelledby="job-contacts" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle id="job-contacts">Contacts and outreach</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <QuickLog
              jobs={[{ id: job.id, label: job.role }]}
              jobId={job.id}
              contacts={contacts}
            />
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link
                  href={`/people/new?${new URLSearchParams({ company: job.company.id, job: job.id })}`}
                />
              }
              className="min-h-11"
            >
              Add a contact
            </Button>
          </div>
        </div>
        {contacts.length ? (
          <ContactList
            people={contacts}
            from={here}
            action={(person) =>
              human ? (
                <RemoveContactButton personId={person.id} jobId={job.id} />
              ) : null
            }
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            No contacts yet. Log a message to someone here, or add one.
          </p>
        )}
        {outreach.length ? (
          <ul aria-label="Outreach" className="flex flex-col divide-y">
            {outreach.map((entry) => (
              <li key={entry.interaction.id} className="py-2">
                <OutreachLine entry={entry} from={here} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="job-notes" className="flex flex-col gap-2">
        <SectionTitle id="job-notes">Notes</SectionTitle>
        <RecordNotes
          record={{ kind: "job", id: job.id }}
          notes={notes}
          canEdit={human}
        />
      </section>

      <section aria-labelledby="job-facts" className="flex flex-col gap-2">
        <SectionTitle id="job-facts">Facts</SectionTitle>
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

      {job.summary ? (
        <section aria-labelledby="job-summary" className="flex flex-col gap-2">
          <SectionTitle id="job-summary">Summary</SectionTitle>
          {/* The posting, in Claude's words: plain text, never instructions (KTD21). */}
          <p className="text-sm whitespace-pre-wrap">{job.summary}</p>
        </section>
      ) : null}

      <section aria-labelledby="job-status" className="flex flex-col gap-4">
        <SectionTitle id="job-status">Status</SectionTitle>
        {isStaleCandidate({ ...job, repliedOn }, today) ? (
          <Alert>
            <AlertDescription>
              No reply 21 days after applying: close it as stale, or move it on.
            </AlertDescription>
          </Alert>
        ) : null}
        <StageControl
          job={{ id: job.id, status: job.status }}
          contacts={contacts}
          today={today}
        />
        {moves.length ? (
          <ol className="flex flex-col divide-y text-sm">
            {moves.map((move) => (
              <li
                key={move.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <span className="text-muted-foreground text-2xs w-24 font-mono">
                  {formatDay(move.on)}
                </span>
                <DriverCode actor={move.actor} />
                <span>
                  {STATUS_LABELS[move.from]} → {STATUS_LABELS[move.to]}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <RecordHistory record={{ kind: "job", id: job.id }} />
    </div>
  );
}

// One interaction linked to the job: what happened, when, with whom, and its note, as plain text
// (docs/build-plan.md KTD21).
function OutreachLine({
  entry: { interaction, person },
  from,
}: {
  entry: JobOutreach;
  from: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
      <span>
        <span className="font-medium">
          {INTERACTION_LABELS[interaction.kind]}
          {interaction.state && interaction.state !== "held"
            ? ` · ${CONVERSATION_LABELS[interaction.state]}`
            : null}
        </span>{" "}
        <Link
          href={withFrom(`/people/${person.id}`, from)}
          className="underline underline-offset-4"
        >
          {person.name}
        </Link>
        <span className="text-muted-foreground">
          {" "}
          · {formatDay(interaction.occurredOn)}
        </span>
      </span>
      {interaction.note ? (
        <span className="whitespace-pre-wrap break-words">
          {interaction.note}
        </span>
      ) : null}
    </div>
  );
}

// The posting's site, as a link says where it goes.
function domainOf(link: string): string {
  return new URL(link).hostname.replace(/^www\./, "");
}

// The job's facts as the page lists them, each by its label, and none as null. What's next has
// its own section, so it isn't listed here.
function factsOf(job: Job): [string, ReactNode | null][] {
  const day = (value: string | null) => (value ? formatDay(value) : null);
  return [
    [
      "Posting",
      job.postingUrl ? (
        <span key="posting">
          <a
            href={job.postingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Open posting
          </a>
          <span className="text-muted-foreground">
            {" "}
            ({domainOf(job.postingUrl)})
          </span>
        </span>
      ) : null,
    ],
    ["Claude's reason", job.reason],
    [FIELD_LABELS.score ?? "Fit score", job.score && `${job.score}/10`],
    [FIELD_LABELS.postedOn ?? "Posted on", day(job.postedOn)],
    [FIELD_LABELS.source ?? "Source", job.source.name],
    [FIELD_LABELS.level ?? "Level", job.level && LEVEL_LABELS[job.level]],
    [
      FIELD_LABELS.workMode ?? "Work mode",
      job.workMode && WORK_MODE_LABELS[job.workMode],
    ],
    [FIELD_LABELS.location ?? "Location", job.location],
    ["Pay", payBand(job)],
    [
      FIELD_LABELS.employmentType ?? "Employment type",
      job.employmentType && EMPLOYMENT_LABELS[job.employmentType],
    ],
    [
      FIELD_LABELS.travelPercent ?? "Travel",
      job.travelPercent === null ? null : `${job.travelPercent}%`,
    ],
    [FIELD_LABELS.teamSize ?? "Team size", job.teamSize],
    [FIELD_LABELS.targetRole ?? "Target role", job.targetRole],
    [FIELD_LABELS.foundOn ?? "Found on", day(job.foundOn)],
    [FIELD_LABELS.appliedOn ?? "Applied on", day(job.appliedOn)],
  ];
}
