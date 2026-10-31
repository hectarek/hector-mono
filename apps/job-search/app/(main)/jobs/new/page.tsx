import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import Link from "next/link";
import { JobForm } from "@/app/_components/job-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { loadCompany } from "@/app/_lib/load-company";
import { getInjection } from "@/di/container";
import { COMPANY_PAGE_MAX } from "@/src/entities/models/company.model";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Adding a job (R1): at a company, picked first by a search of the companies, or given by the
// company's page (?company=).
export default async function NewJobPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;

  if (typeof params.company === "string") {
    const [{ company }, sources] = await Promise.all([
      loadCompany(params.company, actor),
      getInjection("IListSourcesController")({}, actor),
    ]);
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Add a job at {company.name}
        </h1>
        <JobForm
          companyId={company.id}
          sources={sources.map((source) => source.name)}
        />
      </div>
    );
  }

  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const { companies } = await getInjection("IFindCompaniesController")(
    { query, limit: COMPANY_PAGE_MAX },
    actor,
  );
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Add a job</h1>
      <p className="text-muted-foreground text-sm">
        Which company is it at? For a role through an agency, the agency.
      </p>
      <search>
        <form action="/jobs/new" className="flex gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name"
            aria-label="Search companies by name"
            className="min-h-11"
          />
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="min-h-11"
          >
            Search
          </Button>
        </form>
      </search>
      <ul className="flex flex-col gap-2">
        {companies.map((company) => (
          <li key={company.id}>
            <Item
              variant="outline"
              render={<Link href={`/jobs/new?company=${company.id}`} />}
            >
              <ItemContent>
                <ItemTitle>{company.name}</ItemTitle>
                {company.location ? (
                  <ItemDescription>{company.location}</ItemDescription>
                ) : null}
              </ItemContent>
            </Item>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        Not listed?{" "}
        <Link href="/companies/new" className="underline underline-offset-4">
          Add the company
        </Link>{" "}
        first.
      </p>
    </div>
  );
}
