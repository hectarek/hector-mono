import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Plus } from "lucide-react";
import Link from "next/link";
import { JobList } from "@/app/_components/job-list";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";
import { JOB_PAGE_MAX, type JobQuery } from "@/src/entities/models/job.model";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The pipeline's views: open and closed jobs, the review queue (R20) and dismissed proposals.
const VIEWS = {
  open: { label: "Open", query: { status: "open", reviewState: "accepted" } },
  closed: {
    label: "Closed",
    query: { status: "closed", reviewState: "accepted" },
  },
  review: { label: "To review", query: { reviewState: "pending" } },
  dismissed: { label: "Dismissed", query: { reviewState: "dismissed" } },
} satisfies Record<
  string,
  { label: string; query: Pick<JobQuery, "status" | "reviewState"> }
>;
type View = keyof typeof VIEWS;

const EMPTY: Record<View, string> = {
  open: "No open jobs. Add one, or accept one of Claude's proposals.",
  closed: "No closed jobs yet.",
  review: "Nothing to review: Claude's proposals wait here.",
  dismissed: "No dismissed proposals.",
};

// The pipeline (R1): one view at a time, by next date, a page at a time, with the number of
// proposals waiting for review.
export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const params = await searchParams;
  const view: View =
    typeof params.view === "string" && params.view in VIEWS
      ? (params.view as View)
      : "open";
  const offset = Math.max(0, Number.parseInt(String(params.offset), 10) || 0);
  const find = getInjection("IFindJobsController");
  const [{ jobs, nextOffset }, waiting] = await Promise.all([
    find({ ...VIEWS[view].query, limit: JOB_PAGE_MAX, offset }, actor),
    // The cap holds the queue to 50 at most (settings), so one page counts it.
    find({ reviewState: "pending", limit: JOB_PAGE_MAX }, actor),
  ]);

  const pageHref = (from: number) =>
    `/jobs?${new URLSearchParams({ view, offset: String(from) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/jobs/new" />}
          className="min-h-11"
        >
          <Plus />
          Add job
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
                href={`/jobs?view=${each}`}
                aria-current={each === view ? "page" : undefined}
              />
            }
            className="min-h-11"
          >
            {VIEWS[each].label}
            {each === "review" && waiting.jobs.length
              ? ` (${waiting.jobs.length})`
              : null}
          </Button>
        ))}
      </nav>

      {jobs.length ? (
        <JobList jobs={jobs} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{VIEWS[view].label}</EmptyTitle>
            <EmptyDescription>{EMPTY[view]}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {offset > 0 || nextOffset !== null ? (
        <nav aria-label="More jobs" className="flex gap-2">
          {offset > 0 ? (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={
                <Link href={pageHref(Math.max(0, offset - JOB_PAGE_MAX))} />
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
