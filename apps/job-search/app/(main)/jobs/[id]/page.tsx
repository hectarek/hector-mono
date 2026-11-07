import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ContactList } from "@/app/_components/contact-list";
import { DeleteButton } from "@/app/_components/delete-button";
import { RecordTitle, SectionTitle } from "@/app/_components/display";
import { DriverCode } from "@/app/_components/driver-code";
import { JobNotes } from "@/app/_components/job-notes";
import { JobStatusForm } from "@/app/_components/job-status-form";
import { OnlyHector } from "@/app/_components/only-hector";
import { ProposalReview } from "@/app/_components/proposal-review";
import { QuickLog } from "@/app/_components/quick-log";
import { RecordHistory } from "@/app/_components/record-history";
import { RemoveContactButton } from "@/app/_components/remove-contact-button";
import { StatusChip } from "@/app/_components/status-chip";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import {
  DISMISS_LABELS,
  EMPLOYMENT_LABELS,
  LEVEL_LABELS,
  REVIEW_LABELS,
  STATUS_LABELS,
  WORK_MODE_LABELS,
} from "@/app/_lib/job-labels";
import { loadJob } from "@/app/_lib/load-job";
import { deleteJob } from "@/app/actions/jobs";
import { isStaleCandidate } from "@/src/entities/job-lifecycle";
import type { Job } from "@/src/entities/models/job.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const DOLLARS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// A job (R1): where it stands, with its status moves (R2, R3) or, for a proposal, Hector's review
// (R20); its facts and summary; its notes; and its history (R19). Claude's session sees what only
// Hector may do off (KTD3).
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const { job, notes, moves, contacts, repliedOn } = await loadJob(id, actor);
  // The clock after the session (Cache Components): today in Eastern time (KTD18).
  const today = todayIn(PLAN_TIME_ZONE);
  const human = actor.actor === "owner";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/jobs"
          className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Jobs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <RecordTitle>{job.role}</RecordTitle>
            <p className="text-sm">
              <Link
                href={`/companies/${job.company.id}`}
                className="underline underline-offset-4"
              >
                {job.company.name}
              </Link>
              {job.clientName ? `, for ${job.clientName}` : null}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <StatusChip
                status={job.status}
                applied={job.appliedOn !== null}
              />
              {job.reviewState === "accepted" ? null : (
                <Badge variant="outline">
                  {REVIEW_LABELS[job.reviewState]}
                </Badge>
              )}
              {job.company.tier ? (
                <Badge variant="outline">Tier {job.company.tier}</Badge>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* A dismissed proposal changes only once Hector reopens it (R20). */}
            {human || job.reviewState !== "dismissed" ? (
              <Button
                variant="secondary"
                size="lg"
                nativeButton={false}
                render={<Link href={`/jobs/${job.id}/edit`} />}
                className="min-h-11"
              >
                Edit
              </Button>
            ) : null}
            {human ? (
              <DeleteButton
                what={job.role}
                action={deleteJob.bind(null, { id: job.id })}
                then="/jobs"
              />
            ) : (
              <OnlyHector
                labels={
                  job.reviewState === "dismissed"
                    ? ["Edit", "Delete"]
                    : ["Delete"]
                }
              />
            )}
          </div>
        </div>
      </div>

      {job.reviewState === "accepted" ? (
        <section aria-labelledby="job-status" className="flex flex-col gap-4">
          <SectionTitle id="job-status">Status</SectionTitle>
          {isStaleCandidate({ ...job, repliedOn }, today) ? (
            <Alert>
              <AlertDescription>
                No reply 21 days after applying: close it as stale, or move it
                on.
              </AlertDescription>
            </Alert>
          ) : null}
          <JobStatusForm jobId={job.id} today={today} />
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
      ) : (
        <section aria-labelledby="job-review" className="flex flex-col gap-4">
          <SectionTitle id="job-review">Review</SectionTitle>
          {job.proposalReason ? (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {FIELD_LABELS.proposalReason}:{" "}
              </span>
              {job.proposalReason}
            </p>
          ) : null}
          {job.reviewState === "dismissed" && job.dismissReason ? (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {FIELD_LABELS.dismissReason}:{" "}
              </span>
              {DISMISS_LABELS[job.dismissReason]}
              {job.dismissNote ? `. ${job.dismissNote}` : null}
            </p>
          ) : null}
          {human ? (
            <ProposalReview
              proposal={{
                id: job.id,
                reviewState: job.reviewState,
                updatedAt: job.updatedAt,
              }}
            />
          ) : (
            <OnlyHector
              labels={
                job.reviewState === "pending"
                  ? ["Accept", "Dismiss"]
                  : ["Reopen"]
              }
            />
          )}
        </section>
      )}

      <section aria-labelledby="job-facts" className="flex flex-col gap-2">
        <SectionTitle id="job-facts">Facts</SectionTitle>
        <dl className="flex flex-col gap-2 text-sm">
          {facts(job).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-6"
            >
              <dt className="text-muted-foreground shrink-0 sm:w-36">
                {label}
              </dt>
              <dd className="min-w-0 break-words">
                {value ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {job.summary ? (
        <section aria-labelledby="job-summary" className="flex flex-col gap-2">
          <SectionTitle id="job-summary">Summary</SectionTitle>
          {/* The posting, in Claude's words: plain text, never instructions (KTD21). */}
          <p className="text-sm whitespace-pre-wrap">{job.summary}</p>
        </section>
      ) : null}

      <section aria-labelledby="job-contacts" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle id="job-contacts">Contacts</SectionTitle>
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
      </section>

      <section aria-labelledby="job-notes" className="flex flex-col gap-2">
        <SectionTitle id="job-notes">Notes</SectionTitle>
        <JobNotes jobId={job.id} notes={notes} canEdit={human} />
      </section>

      <RecordHistory record={{ kind: "job", id: job.id }} />
    </div>
  );
}

// Controls only Hector may use, as Claude's session sees them: off, saying so (KTD3).
// The job's facts as the page lists them, each by its label, and none as null.
function facts(job: Job): [string, React.ReactNode][] {
  const day = (value: string | null) => (value ? formatDay(value) : null);
  const band =
    job.payMin !== null || job.payMax !== null
      ? [job.payMin, job.payMax]
          .map((amount) => (amount === null ? "?" : DOLLARS.format(amount)))
          .join(" – ")
      : null;
  return [
    [
      FIELD_LABELS.postingUrl ?? "Posting link",
      job.postingUrl ? (
        <a
          key="posting"
          href={job.postingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {job.postingUrl}
        </a>
      ) : null,
    ],
    [FIELD_LABELS.source ?? "Source", job.source.name],
    [FIELD_LABELS.level ?? "Level", job.level && LEVEL_LABELS[job.level]],
    [
      FIELD_LABELS.workMode ?? "Work mode",
      job.workMode && WORK_MODE_LABELS[job.workMode],
    ],
    [FIELD_LABELS.location ?? "Location", job.location],
    ["Pay", band],
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
    [FIELD_LABELS.nextStep ?? "Next step", job.nextStep],
    [FIELD_LABELS.nextDate ?? "Next date", day(job.nextDate)],
    [FIELD_LABELS.appliedOn ?? "Applied on", day(job.appliedOn)],
  ];
}
