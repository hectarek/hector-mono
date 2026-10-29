import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WeekCounts } from "@/app/_components/week-counts";
import { WeeklyReviewForm } from "@/app/_components/weekly-review-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { formatMoment } from "@/app/_lib/format-day";
import { ACTOR_LABELS } from "@/app/_lib/job-labels";
import { getInjection } from "@/di/container";
import { getWeekSchema } from "@/src/entities/models/weekly-review.model";
import { formatWeekRange } from "@/src/entities/week";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The weekly review (R10, U9): a week's counts beside its targets, a way to the weeks before and
// after, and its review. With no review saved, the counts are live and the form is empty. Once
// saved, the counts and targets are the review's snapshot, any live count that no longer matches
// shows beside it, and the form edits only the milestone and the change. This week unless
// `?week=` names another week's Monday.
export default async function WeekPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await getPageActor();
  const { week } = await searchParams;
  const query = getWeekSchema.safeParse({
    week: typeof week === "string" ? week : undefined,
  });
  if (!query.success) {
    notFound();
  }
  const view = await getInjection("IGetWeekController")(query.data, actor);
  const { review } = view;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Weekly review
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatWeekRange(view.week)}
          </p>
        </div>
        <nav aria-label="Weeks" className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href={`/week?week=${view.previous}`} />}
            className="min-h-11"
          >
            Previous week
          </Button>
          {view.next ? (
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<Link href={`/week?week=${view.next}`} />}
              className="min-h-11"
            >
              Next week
            </Button>
          ) : null}
        </nav>
      </div>

      <section aria-labelledby="week-counts" className="flex flex-col gap-3">
        <h2 id="week-counts" className="font-semibold">
          {review ? "The week as saved" : "The week so far"}
        </h2>
        <WeekCounts
          counts={review?.counts ?? view.counts}
          targets={review?.targets ?? view.targets}
          live={review ? view.counts : undefined}
        />
        {review ? (
          <p className="text-muted-foreground text-sm">
            Saved {formatMoment(review.createdAt)} by{" "}
            {ACTOR_LABELS[review.author]}, with the targets of that day.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="week-review" className="flex flex-col gap-3">
        <h2 id="week-review" className="font-semibold">
          Review
        </h2>
        <WeeklyReviewForm week={view.week} review={review} />
      </section>
    </div>
  );
}
