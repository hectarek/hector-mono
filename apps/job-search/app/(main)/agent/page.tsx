import { Badge } from "@repo/ui/components/badge";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";
import type { ActivityEntry } from "@/src/entities/models/activity.model";
import { PLAN_TIME_ZONE } from "@/src/entities/week";

// How many of Claude's latest changes the page lists.
const RECENT = 20;

// A tool's annotations, as the page names them.
const HINTS = [
  ["readOnlyHint", "Read-only"],
  ["consequentialHint", "Asks first"],
  ["untrustedContentHint", "Outside text"],
] as const;

const ACTIONS: Record<ActivityEntry["action"], string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  refused: "Refused",
};

// Eastern time, as everywhere in the app (docs/build-plan.md KTD18).
const WHEN = new Intl.DateTimeFormat("en-US", {
  timeZone: PLAN_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Claude's working page (docs/build-plan.md KTD6): its page tools and what it did lately. Light
// on purpose, with no calendar and no auto refresh, so the re-render after each of Claude's writes
// reads only the log.
export default async function AgentPage() {
  const actor = await getPageActor();
  const { entries } = await getInjection("IListActivityController")(
    { actor: "agent", limit: RECENT },
    actor,
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Claude</h1>
        <p className="text-muted-foreground text-sm">
          Page tools and recent activity
        </p>
      </div>

      <section aria-labelledby="agent-tools" className="flex flex-col gap-2">
        <h2 id="agent-tools" className="font-semibold">
          Page tools
        </h2>
        <ul className="flex flex-col divide-y">
          {AGENT_TOOLS.map(({ name, description, annotations = {} }) => (
            <li key={name} className="flex flex-col gap-1.5 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <code className="font-medium">{name}</code>
                {HINTS.map(([hint, label]) =>
                  annotations[hint] ? (
                    <Badge key={hint} variant="secondary">
                      {label}
                    </Badge>
                  ) : null,
                )}
              </p>
              <p className="text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="agent-activity" className="flex flex-col gap-2">
        <h2 id="agent-activity" className="font-semibold">
          Recent activity
        </h2>
        {entries.length ? (
          <ol className="flex flex-col divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 py-3 text-sm"
              >
                <span className="font-medium">{whatHappened(entry)}</span>
                {entry.tool ? (
                  <code className="text-muted-foreground text-xs">
                    {entry.tool}
                  </code>
                ) : null}
                <time
                  dateTime={entry.createdAt.toISOString()}
                  className="text-muted-foreground ml-auto text-xs"
                >
                  {WHEN.format(entry.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}

// A change in a few words: a session's start, or what happened to which kind of record.
function whatHappened({ action, record }: ActivityEntry): string {
  return record.kind === "agent-session"
    ? "Started a session"
    : `${ACTIONS[action]} a ${record.kind}`;
}
