import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/app/_components/delete-button";
import { JobList } from "@/app/_components/job-list";
import { OnlyHector } from "@/app/_components/only-hector";
import { RecordHistory } from "@/app/_components/record-history";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { loadCompany } from "@/app/_lib/load-company";
import { deleteCompany } from "@/app/actions/companies";
import { getInjection } from "@/di/container";
import type { Company } from "@/src/entities/models/company.model";
import { JOB_PAGE_MAX } from "@/src/entities/models/job.model";

const HEADCOUNT = new Intl.NumberFormat("en-US");

// A company (R4): its facts and research, a warning when another company's name matches its own,
// its jobs, the proposals that name it, waiting or dismissed (each keeps it from its delete), and
// its history (R19). Its people arrive with U7.
export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const { company, similar, jobs } = await loadCompany(id, actor);
  const find = getInjection("IFindJobsController");
  const [waiting, dismissed] = await Promise.all([
    find(
      { companyId: company.id, reviewState: "pending", limit: JOB_PAGE_MAX },
      actor,
    ),
    find(
      { companyId: company.id, reviewState: "dismissed", limit: JOB_PAGE_MAX },
      actor,
    ),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/companies"
          className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Companies
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {company.name}
            </h1>
            {company.tier ? (
              <Badge variant="secondary">Tier {company.tier}</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
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
                    href={`/companies/${other.id}`}
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

      <section aria-labelledby="company-facts" className="flex flex-col gap-2">
        <h2 id="company-facts" className="font-semibold">
          Facts
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {FACTS.map((fact) => (
            <div
              key={fact}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-6"
            >
              <dt className="text-muted-foreground shrink-0 sm:w-36">
                {FIELD_LABELS[fact]}
              </dt>
              <dd className="min-w-0 break-words">
                <Fact company={company} fact={fact} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="company-research"
        className="flex flex-col gap-2"
      >
        <h2 id="company-research" className="font-semibold">
          Research
        </h2>
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

      <section aria-labelledby="company-jobs" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="company-jobs" className="font-semibold">
            Jobs
          </h2>
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
          <JobList jobs={jobs} />
        ) : (
          <p className="text-muted-foreground text-sm">No jobs here yet.</p>
        )}
      </section>

      {waiting.jobs.length ? (
        <section
          aria-labelledby="company-waiting"
          className="flex flex-col gap-2"
        >
          <h2 id="company-waiting" className="font-semibold">
            To review
          </h2>
          <JobList jobs={waiting.jobs} />
        </section>
      ) : null}

      {dismissed.jobs.length ? (
        <section
          aria-labelledby="company-dismissed"
          className="flex flex-col gap-2"
        >
          <h2 id="company-dismissed" className="font-semibold">
            Dismissed
          </h2>
          <JobList jobs={dismissed.jobs} />
        </section>
      ) : null}

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
// and a dash for none.
function Fact({
  company,
  fact,
}: {
  company: Company;
  fact: (typeof FACTS)[number];
}) {
  if (fact === "website" && company.website) {
    return (
      <a
        href={company.website}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {company.website}
      </a>
    );
  }
  if (fact === "headcount" && company.headcount !== null) {
    return HEADCOUNT.format(company.headcount);
  }
  return company[fact] ?? <span className="text-muted-foreground">—</span>;
}
