import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CompanyList } from "@/app/_components/company-list";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";
import { COMPANY_PAGE_MAX } from "@/src/entities/models/company.model";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The owner's companies by name, a page at a time, with a search by name (R4).
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const offset = Math.max(0, Number.parseInt(String(params.offset), 10) || 0);
  const { companies, nextOffset } = await getInjection(
    "IFindCompaniesController",
  )({ query, limit: COMPANY_PAGE_MAX, offset }, actor);

  // The same search, from another place in the list.
  const pageHref = (from: number) =>
    `/companies?${new URLSearchParams({ ...(query && { q: query }), offset: String(from) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/companies/new" />}
          className="min-h-11"
        >
          <Plus />
          Add company
        </Button>
      </div>

      <search>
        <form action="/companies" className="flex gap-2">
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

      {companies.length ? (
        <CompanyList companies={companies} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {query ? "No company by that name" : "No companies yet"}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? "Try part of the name, or add the company."
                : "Add one, or Claude will as it finds jobs."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {offset > 0 || nextOffset !== null ? (
        <nav aria-label="More companies" className="flex gap-2">
          {offset > 0 ? (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link href={pageHref(Math.max(0, offset - COMPANY_PAGE_MAX))} />
              }
              className="min-h-11"
            >
              Previous
            </Button>
          ) : null}
          {nextOffset !== null ? (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={pageHref(nextOffset)} />}
              className="min-h-11"
            >
              Next
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
