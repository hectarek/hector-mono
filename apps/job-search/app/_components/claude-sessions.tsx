import Link from "next/link";
import { DriverCode } from "@/app/_components/driver-code";
import { formatMoment } from "@/app/_lib/format-day";
import { STATUS_LABELS } from "@/app/_lib/job-labels";
import type { ClaudeSession } from "@/src/entities/claude-sessions";
import type { JobStatus } from "@/src/entities/job-lifecycle";
import type {
  ActivityEntry,
  RecordRef,
} from "@/src/entities/models/activity.model";

// What each kind of record is called in a session's counts.
const KINDS: Record<RecordRef["kind"], [one: string, many: string]> = {
  company: ["company", "companies"],
  "lead-source": ["lead source", "lead sources"],
  settings: ["settings change", "settings changes"],
  job: ["job", "jobs"],
  note: ["note", "notes"],
  person: ["person", "people"],
  interaction: ["interaction", "interactions"],
  "practice-entry": ["practice entry", "practice entries"],
  "weekly-review": ["weekly review", "weekly reviews"],
  block: ["block", "blocks"],
  "agent-session": ["session", "sessions"],
};

// Claude's sessions of the last 7 days on This week (R9), in the design system's timing feed: a
// header with Claude's driver code and when each started, how many changes it made to each kind
// of record, and its closing moves and refused attempts one by one. Each links to Claude's page,
// which lists every change.
export function ClaudeSessions({ sessions }: { sessions: ClaudeSession[] }) {
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-xl border">
      {sessions.map((session) => {
        // A session that changed nothing folds into its header's one line (the UX plan's UX4).
        const empty = !session.counts.length && !session.listed.length;
        return (
          <li key={session.id ?? session.startedAt.toISOString()}>
            <div className="bg-muted flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
              <DriverCode actor="agent" />
              <Link
                href="/agent"
                className="font-bold underline-offset-4 hover:underline"
              >
                {session.id ? "Session" : "Earlier session"},{" "}
                {formatMoment(session.startedAt)}
              </Link>
              {empty ? (
                <span className="text-muted-foreground">No changes</span>
              ) : null}
            </div>
            {empty ? null : <SessionChanges session={session} />}
          </li>
        );
      })}
    </ul>
  );
}

// What a session changed: how many records of each kind, then its closing moves and refused
// attempts one by one.
function SessionChanges({ session }: { session: ClaudeSession }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 text-sm">
      <p className="text-muted-foreground">
        {session.counts
          .map(
            ({ kind, changes }) =>
              `${changes} ${KINDS[kind][changes === 1 ? 0 : 1]}`,
          )
          .join(", ")}
      </p>
      {session.listed.length ? (
        <ul className="flex flex-col gap-1">
          {session.listed.map((entry) => (
            <li
              key={entry.id}
              className={
                entry.action === "refused" ? "text-destructive" : undefined
              }
            >
              {listed(entry)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// A change This week lists one by one: a refused attempt, or a job's closing move.
function listed(entry: ActivityEntry): string {
  if (entry.action === "refused") {
    return `Refused: ${entry.reason ?? "a change"} on a ${KINDS[entry.record.kind][0]}`;
  }
  const status = entry.changes.find(({ field }) => field === "status")?.after;
  return `Closed a job as ${STATUS_LABELS[status as JobStatus] ?? "closed"}${
    entry.reason ? `: ${entry.reason}` : ""
  }`;
}
