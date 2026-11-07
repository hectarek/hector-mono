import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { EmptySectors, PageTitle } from "@/app/_components/display";
import { PersonList } from "@/app/_components/person-list";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";

// How many people a page of the list holds.
const PAGE = 50;

// People's views (the UX plan's UX6): everyone by next step (late, today, upcoming, no date, then
// none, rank A first in each), or only the steps with no date, each dated from its row.
const VIEWS = {
  next: { label: "Next steps", undated: false },
  "no-date": { label: "No date", undated: true },
} as const;
type View = keyof typeof VIEWS;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The owner's people a page at a time, by next step, with a view of the steps with no date and a
// search by name or company, whose matches list by name (R7 as revised 2026-11-07). The quick log
// for a message, a reply or a conversation with anyone is the shell's (R8).
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const view: View =
    typeof params.view === "string" && params.view in VIEWS
      ? (params.view as View)
      : "next";
  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const offset = Math.max(0, Number.parseInt(String(params.offset), 10) || 0);
  const { people, nextOffset } = await getInjection("IFindPeopleController")(
    {
      query,
      undated: VIEWS[view].undated,
      order: query ? "name" : "next-step",
      limit: PAGE,
      offset,
    },
    actor,
  );

  // The same view and search, from another place in the list.
  const pageHref = (from: number) =>
    `/people?${new URLSearchParams({ view, ...(query && { q: query }), offset: String(from) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>People</PageTitle>
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href="/people/new" />}
          className="min-h-11"
        >
          <UserPlus />
          Add person
        </Button>
      </div>

      <nav aria-label="Views" className="flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((each) => (
          <Button
            key={each}
            variant={each === view ? "default" : "secondary"}
            size="lg"
            nativeButton={false}
            render={
              <Link
                href={`/people?view=${each}`}
                aria-current={each === view ? "page" : undefined}
              />
            }
            className="min-h-11"
          >
            {VIEWS[each].label}
          </Button>
        ))}
      </nav>

      <search>
        <form action="/people" className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name or company"
            aria-label="Search people by name or company"
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

      {people.length ? (
        <PersonList
          people={people}
          from={`/people?${new URLSearchParams({ view, ...(query && { q: query }) })}`}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <EmptySectors />
            </EmptyMedia>
            <EmptyTitle>
              {query
                ? "No one by that name or company"
                : view === "no-date"
                  ? "No steps without a date"
                  : "No people yet"}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? "Try part of the name, or add the person."
                : view === "no-date"
                  ? "Every next step has a date, so each reaches This week when it's due."
                  : "Add someone you know, or log a message to someone new."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {offset > 0 || nextOffset !== null ? (
        <nav aria-label="More people" className="flex gap-2">
          {offset > 0 ? (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={pageHref(Math.max(0, offset - PAGE))} />}
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
