import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";

import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/app/_components/back-link";
import { ContactList } from "@/app/_components/contact-list";
import { DeleteButton } from "@/app/_components/delete-button";
import { SectionTitle } from "@/app/_components/display";
import { JobList } from "@/app/_components/job-list";
import { OnlyHector } from "@/app/_components/only-hector";
import { factsLine, RecordHeader } from "@/app/_components/record-header";
import { RecordHistory } from "@/app/_components/record-history";
import { backTo, withFrom } from "@/app/_lib/back-link";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { loadCompany } from "@/app/_lib/load-company";
import { deleteCompany } from "@/app/actions/companies";
import type { Company } from "@/src/entities/models/company.model";

const HEADCOUNT = new Intl.NumberFormat("en-US");

// A company (R4), in the order every record's page takes (the UX plan's UX8): its header (who
// added it, where it is and what it does, its tier, and actions), a warning when another
// company's name matches its own, its jobs (archived ones too, which keep it from its delete, as
// its people do) and people, its facts, the filled ones first, its research, and its history
// (R19).
export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const back = backTo((await searchParams).from, {
    href: "/companies",
    label: "Companies",
  });
  // Where this page sends the records it links to back to.
  const here = `/companies/${id}`;
  const { company, similar, jobs, people, added } = await loadCompany(
    id,
    actor,
  );
  const facts = FACTS.map((fact): [string, ReactNode | null] => [
    FIELD_LABELS[fact] ?? fact,
    factOf(company, fact),
  ]);
  const filled = facts.filter(([, value]) => value !== null);
  const empty = facts.filter(([, value]) => value === null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BackLink back={back} />
        <RecordHeader
          kind="Company"
          added={added}
          name={company.name}
          facts={
            factsLine([
              company.location,
              company.industry,
              company.headcount === null
                ? null
                : `${HEADCOUNT.format(company.headcount)} people`,
            ]) || undefined
          }
          status={
            company.tier ? (
              <Badge variant="secondary">Tier {company.tier}</Badge>
            ) : undefined
          }
          actions={
            <>
              <Button
                variant="secondary"
                size="lg"
                nativeButton={false}
                render={<Link href={`/companies/${company.id}/edit`} />}
                className="min-h-11"
              >
                Edit
              </Button>
              {/* Deleting is Hector's alone (R21): Claude's session sees it off (KTD3). */}
              {actor.actor === "owner" ? (
                <DeleteButton
                  what={company.name}
                  action={deleteCompany.bind(null, { id: company.id })}
                  then="/companies"
                />
              ) : (
                <OnlyHector labels={["Delete"]} />
              )}
            </>
          }
        />
      </div>

      {similar.length ? (
        <Alert>
          <AlertTitle>A similar name</AlertTitle>
          <AlertDescription>
            <p>
              {similar.length === 1 ? "This company" : "These companies"} may be
              the same one:
            </p>
            <ul>
              {similar.map((other) => (
                <li key={other.id}>
                  <Link
                    href={withFrom(`/companies/${other.id}`, here)}
                    className="underline underline-offset-4"
                  >
                    {other.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="company-jobs" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle id="company-jobs">Jobs</SectionTitle>
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href={`/jobs/new?company=${company.id}`} />}
            className="min-h-11"
          >
            Add a job
          </Button>
        </div>
        {jobs.length ? (
          <JobList jobs={jobs} atCompany from={here} />
        ) : (
          <p className="text-muted-foreground text-sm">No jobs here yet.</p>
        )}
      </section>

      <section aria-labelledby="company-people" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle id="company-people">People</SectionTitle>
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href={`/people/new?company=${company.id}`} />}
            className="min-h-11"
          >
            Add a person
          </Button>
        </div>
        {people.length ? (
          <ContactList people={people} from={here} />
        ) : (
          <p className="text-muted-foreground text-sm">No one here yet.</p>
        )}
      </section>

      <section aria-labelledby="company-facts" className="flex flex-col gap-2">
        <SectionTitle id="company-facts">Facts</SectionTitle>
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

      <section
        aria-labelledby="company-research"
        className="flex flex-col gap-2"
      >
        <SectionTitle id="company-research">Research</SectionTitle>
        {company.researchSummary ? (
          <p className="text-sm whitespace-pre-wrap">
            {company.researchSummary}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">No summary yet.</p>
        )}
        {company.researchRef ? (
          <p className="text-sm">
            <span className="text-muted-foreground">
              {FIELD_LABELS.researchRef}:{" "}
            </span>
            <span className="break-words">{company.researchRef}</span>
          </p>
        ) : null}
      </section>

      <RecordHistory record={{ kind: "company", id: company.id }} />
    </div>
  );
}

// The facts the page lists, in order; research has its own section.
const FACTS = [
  "website",
  "location",
  "headcount",
  "industry",
  "officePolicy",
  "leavePolicy",
] as const;

// A fact as the page shows it: plain text (docs/build-plan.md KTD21), the website as a link out,
// and null for none.
function factOf(
  company: Company,
  fact: (typeof FACTS)[number],
): ReactNode | null {
  if (fact === "website") {
    return company.website ? (
      <a
        href={company.website}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {company.website}
      </a>
    ) : null;
  }
  if (fact === "headcount") {
    return company.headcount === null
      ? null
      : HEADCOUNT.format(company.headcount);
  }
  return company[fact];
}
