import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { PersonList } from "@/app/_components/person-list";
import { QuickLog } from "@/app/_components/quick-log";
import { getPageActor } from "@/app/_lib/current-actor";
import { listCompanies } from "@/app/_lib/list-companies";
import { getInjection } from "@/di/container";

// How many people a page of the list holds.
const PAGE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The owner's people by name, a page at a time, with a search by name (R7), and the quick log for
// a message, a reply or a conversation with anyone (R8).
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const offset = Math.max(0, Number.parseInt(String(params.offset), 10) || 0);
  const [{ people, nextOffset }, companies] = await Promise.all([
    getInjection("IFindPeopleController")(
      { query, limit: PAGE, offset },
      actor,
    ),
    listCompanies(actor),
  ]);

  // The same search, from another place in the list.
  const pageHref = (from: number) =>
    `/people?${new URLSearchParams({ ...(query && { q: query }), offset: String(from) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">People</h1>
        <div className="flex flex-wrap items-center gap-2">
          <QuickLog companies={companies} />
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
      </div>

      <search>
        <form action="/people" className="flex gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name"
            aria-label="Search people by name"
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
            <EmptyTitle>
              {query ? "No one by that name" : "No people yet"}
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
