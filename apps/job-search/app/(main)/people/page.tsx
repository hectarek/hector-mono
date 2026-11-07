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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The owner's people by name, a page at a time, with a search by name or company (R7). The quick
// log for a message, a reply or a conversation with anyone is the shell's (R8).
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const offset = Math.max(0, Number.parseInt(String(params.offset), 10) || 0);
  const { people, nextOffset } = await getInjection("IFindPeopleController")(
    { query, limit: PAGE, offset },
    actor,
  );

  // The same search, from another place in the list.
  const pageHref = (from: number) =>
    `/people?${new URLSearchParams({ ...(query && { q: query }), offset: String(from) })}`;

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

      <search>
        <form action="/people" className="flex gap-2">
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
        <PersonList people={people} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <EmptySectors />
            </EmptyMedia>
            <EmptyTitle>
              {query ? "No one by that name or company" : "No people yet"}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? "Try part of the name, or add the person."
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
