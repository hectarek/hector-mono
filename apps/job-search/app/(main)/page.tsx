import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ClaudeSessions } from "@/app/_components/claude-sessions";
import { DebriefCard } from "@/app/_components/debrief-card";
import { PageTitle, SectionTitle } from "@/app/_components/display";
import { DueList } from "@/app/_components/due-list";
import { ProposalCard } from "@/app/_components/proposal-card";
import { WeekCounts } from "@/app/_components/week-counts";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";
import { formatWeekRange } from "@/src/entities/week";

// How often the page refreshes while it's on screen (docs/build-plan.md KTD15).
const REFRESH_MS = 60_000;

// This week (R9): what needs Hector's decision first, then what's due, Claude's recent sessions,
// and the week's counts against his targets. Due always shows, with the next task on the pit
// board or the board's clear state; any other section with nothing in it collapses. The calendar
// joins with U13. The page refreshes while it's on screen, so Claude's changes show (KTD15).
export default async function ThisWeekPage() {
  // The session first: it keeps other accounts out, and it ends the prerender, so the clock
  // is read only at request time.
  const actor = await getPageActor();
  const { today, monday, decisions, due, claude, counts, targets } =
    await getInjection("IGetTodayController")({}, actor);
  const human = actor.actor === "owner";
  const waiting = decisions.proposals.length + decisions.debriefs.length;

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <div className="flex flex-col gap-1">
        <PageTitle>This week</PageTitle>
        <p className="text-muted-foreground text-sm">
          {formatWeekRange(monday)}
        </p>
      </div>

      {waiting ? (
        <section
          aria-labelledby="week-decisions"
          className="flex flex-col gap-3"
        >
          <SectionTitle id="week-decisions">Decisions</SectionTitle>
          <ul className="flex flex-col gap-4">
            {decisions.proposals.map((proposal) => (
              <li key={proposal.id}>
                <ProposalCard proposal={proposal} human={human} />
              </li>
            ))}
            {decisions.debriefs.map((debrief) => (
              <li key={debrief.conversation.id}>
                <DebriefCard debrief={debrief} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="week-due" className="flex flex-col gap-3">
        <SectionTitle id="week-due">Due</SectionTitle>
        <DueList due={due} today={today} waiting={waiting} />
      </section>

      {claude.length ? (
        <section aria-labelledby="week-claude" className="flex flex-col gap-3">
          <SectionTitle id="week-claude">
            Claude&apos;s recent changes
          </SectionTitle>
          <ClaudeSessions sessions={claude} />
        </section>
      ) : null}

      <section aria-labelledby="week-counts" className="flex flex-col gap-3">
        <SectionTitle id="week-counts">The week so far</SectionTitle>
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
    </div>
  );
}
