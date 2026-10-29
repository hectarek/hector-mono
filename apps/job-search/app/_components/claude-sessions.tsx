import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import Link from "next/link";
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
  "agent-session": ["session", "sessions"],
};

// Claude's sessions of the last 7 days on This week (R9): when each started, how many changes it
// made to each kind of record, and its closing moves and refused attempts one by one. Each links
// to Claude's page, which lists every change.
export function ClaudeSessions({ sessions }: { sessions: ClaudeSession[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => (
        <li key={session.id ?? session.startedAt.toISOString()}>
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>
                <Link
                  href="/agent"
                  className="underline-offset-4 hover:underline"
                >
                  {session.id ? "Session" : "Earlier session"},{" "}
                  {formatMoment(session.startedAt)}
                </Link>
              </ItemTitle>
              <ItemDescription>
                {session.counts.length
                  ? session.counts
                      .map(
                        ({ kind, changes }) =>
                          `${changes} ${KINDS[kind][changes === 1 ? 0 : 1]}`,
                      )
                      .join(", ")
                  : "No changes"}
              </ItemDescription>
              {session.listed.length ? (
                <ul className="text-sm">
                  {session.listed.map((entry) => (
                    <li key={entry.id}>{listed(entry)}</li>
                  ))}
                </ul>
              ) : null}
            </ItemContent>
          </Item>
        </li>
      ))}
    </ul>
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
