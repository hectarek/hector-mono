import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PracticeList } from "@/app/_components/practice-list";
import { PracticeReview } from "@/app/_components/practice-review";
import { getPageActor } from "@/app/_lib/current-actor";
import { formatDay } from "@/app/_lib/format-day";
import { getInjection } from "@/di/container";
import { LADDER_STEPS } from "@/src/entities/practice-ladder";

// How many of the latest sessions the page lists.
const RECENT = 30;

// The practice log (R11): the reviews due by today, the earliest first, each logged from a sheet,
// then the latest sessions. Logging a session opens its own page.
export default async function PracticePage() {
  const actor = await getPageActor();
  const { today, due, recent } = await getInjection("IListPracticeController")(
    { limit: RECENT },
    actor,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Practice</h1>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/practice/new" />}
          className="min-h-11"
        >
          <Plus />
          Log session
        </Button>
      </div>

      <section aria-labelledby="practice-due" className="flex flex-col gap-2">
        <h2 id="practice-due" className="font-semibold">
          Reviews due
        </h2>
        {due.length ? (
          <ul className="flex flex-col gap-2">
            {due.map(({ id, topic, nextReview }) => (
              <li key={id}>
                <Item variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <Link
                        href={`/practice/${id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {topic}
                      </Link>
                      {nextReview.dueOn < today ? (
                        <Badge variant="secondary">Overdue</Badge>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription>
                      Review {nextReview.step} of {LADDER_STEPS} · due{" "}
                      {formatDay(nextReview.dueOn)}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <PracticeReview
                      session={{ id, topic, step: nextReview.step }}
                    />
                  </ItemActions>
                </Item>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No reviews due today. A session&apos;s first review comes 2 days
            after it.
          </p>
        )}
      </section>

      <section
        aria-labelledby="practice-recent"
        className="flex flex-col gap-2"
      >
        <h2 id="practice-recent" className="font-semibold">
          Recent sessions
        </h2>
        {recent.length ? (
          <PracticeList sessions={recent} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No practice yet</EmptyTitle>
              <EmptyDescription>
                Log a session, and its reviews follow on a 2, 7 and 21 day
                ladder.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  );
}
