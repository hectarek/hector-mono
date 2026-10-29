import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ClaudeSessions } from "@/app/_components/claude-sessions";
import { DebriefCard } from "@/app/_components/debrief-card";
import { DueList } from "@/app/_components/due-list";
import { ProposalCard } from "@/app/_components/proposal-card";
import { WeekCounts } from "@/app/_components/week-counts";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";
import { formatWeekRange } from "@/src/entities/week";

// How often the page refreshes while it's on screen (docs/build-plan.md KTD15).
const REFRESH_MS = 60_000;

// This week (R9): what needs Hector's decision first, then what's due, Claude's recent sessions,
// and the week's counts against his targets. A section with nothing in it collapses. The calendar
// joins with U13. The page refreshes while it's on screen, so Claude's changes show (KTD15).
export default async function ThisWeekPage() {
  // The session first: it keeps other accounts out, and it ends the prerender, so the clock
  // is read only at request time.
  const actor = await getPageActor();
  const { today, monday, decisions, due, claude, counts, targets } =
    await getInjection("IGetTodayController")({}, actor);
  const human = actor.actor === "owner";
  const hasDecisions =
    decisions.proposals.length + decisions.debriefs.length > 0;
  const hasDue =
    due.stale.length +
      due.jobs.length +
      due.people.length +
      due.practice.length >
    0;

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This week</h1>
        <p className="text-muted-foreground text-sm">
          {formatWeekRange(monday)}
        </p>
      </div>

      {hasDecisions ? (
        <section
          aria-labelledby="week-decisions"
          className="flex flex-col gap-3"
        >
          <h2 id="week-decisions" className="font-semibold">
            Decisions
          </h2>
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

      {hasDue ? (
        <section aria-labelledby="week-due" className="flex flex-col gap-3">
          <h2 id="week-due" className="font-semibold">
            Due
          </h2>
          <DueList due={due} today={today} />
        </section>
      ) : null}

      {hasDecisions || hasDue ? null : (
        <p className="text-muted-foreground text-sm">
          Nothing needs a decision or is due today.
        </p>
      )}

      {claude.length ? (
        <section aria-labelledby="week-claude" className="flex flex-col gap-3">
          <h2 id="week-claude" className="font-semibold">
            Claude&apos;s recent changes
          </h2>
          <ClaudeSessions sessions={claude} />
        </section>
      ) : null}

      <section aria-labelledby="week-counts" className="flex flex-col gap-3">
        <h2 id="week-counts" className="font-semibold">
          The week so far
        </h2>
        <WeekCounts counts={counts} targets={targets} />
      </section>
    </div>
  );
}
