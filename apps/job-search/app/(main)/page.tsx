import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ClaudeSessions } from "@/app/_components/claude-sessions";
import { PageTitle, SectionTitle } from "@/app/_components/display";
import {
  dueTasks,
  LaterThisWeek,
  NeedsYou,
  NextTask,
} from "@/app/_components/due-list";
import { ToApplyList } from "@/app/_components/to-apply-list";
import { TodayBlocks } from "@/app/_components/today-blocks";
import { TrackMap } from "@/app/_components/track-map";
import { WeekCounts } from "@/app/_components/week-counts";
import { WeekLine } from "@/app/_components/week-line";
import { getPageActor } from "@/app/_lib/current-actor";
import { formatWeekday } from "@/app/_lib/format-day";
import { getInjection } from "@/di/container";
import { formatWeekRange } from "@/src/entities/week";

// How often the page refreshes while it's on screen (docs/build-plan.md KTD15).
const REFRESH_MS = 60_000;

// Today, the home page (R9 as revised 2026-11-10, U20), in R9's order: the season's track and the
// week's line under it, the next task on the pit board, today's schedule (its Focus blocks), what
// needs Hector, the top three jobs to apply to (R27), what's due later this week, the week's counts
// against his targets, and Claude's recent work. The next task always shows, as the pit board or
// its clear state; any other section with nothing in it collapses, and so does the track until a
// season is set. The week's line shows the milestone once planning sets it. The calendar's events
// join the schedule with U14. The page refreshes while it's on screen, so Claude's changes show
// (KTD15).
export default async function TodayPage() {
  // The session first: it keeps other accounts out, and it ends the prerender, so the clock
  // is read only at request time.
  const actor = await getPageActor();
  const {
    today,
    monday,
    applyNext,
    decisions,
    due,
    later,
    undated,
    blocks,
    weekBlocks,
    milestone,
    claude,
    counts,
    targets,
    season,
  } = await getInjection("IGetTodayController")({}, actor);
  // Read after the session, as today is: the block happening now takes the signal border.
  const now = new Date();
  const human = actor.actor === "owner";
  const tasks = dueTasks(due, later, today);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <PageTitle>Today</PageTitle>
          <p className="text-muted-foreground text-sm">
            {formatWeekday(today)} · {formatWeekRange(monday)}
          </p>
        </div>
        {season ? <TrackMap season={season} today={today} /> : null}
        <WeekLine
          applications={counts.applications}
          target={targets.applications}
          milestone={milestone}
          blocks={weekBlocks}
        />
      </div>

      <NextTask
        tasks={tasks}
        today={today}
        waiting={decisions.debriefs.length + due.stale.length}
      />

      {blocks.length ? <TodayBlocks blocks={blocks} now={now} /> : null}

      <NeedsYou
        tasks={tasks}
        stale={due.stale}
        debriefs={decisions.debriefs}
        undated={undated}
        today={today}
      />

      {applyNext.length ? (
        <section aria-labelledby="today-apply" className="flex flex-col gap-3">
          <SectionTitle id="today-apply">Apply next</SectionTitle>
          <ToApplyList jobs={applyNext} from="/" human={human} />
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href="/jobs?view=to-apply" />}
            className="min-h-11 w-fit"
          >
            The whole list
          </Button>
        </section>
      ) : null}

      <LaterThisWeek tasks={tasks} today={today} />

      <section aria-labelledby="today-counts" className="flex flex-col gap-3">
        <SectionTitle id="today-counts">The week so far</SectionTitle>
        <WeekCounts counts={counts} targets={targets} />
        <Button
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<Link href="/week" />}
          className="min-h-11 w-fit"
        >
          Weekly review
        </Button>
      </section>

      {claude.length ? (
        <section aria-labelledby="today-claude" className="flex flex-col gap-3">
          <SectionTitle id="today-claude">
            Claude&apos;s recent work
          </SectionTitle>
          <ClaudeSessions sessions={claude} />
        </section>
      ) : null}
    </div>
  );
}
