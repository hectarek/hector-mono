import { CLOSED_STATUSES, type JobStatus } from "./job-lifecycle";
import type { ActivityEntry, RecordRef } from "./models/activity.model";

// One of Claude's working sessions as This week lists it (R9, U9): when it started, how many
// changes it made to each kind of record, and the changes worth seeing one by one (a job's closing
// move, a refused attempt). `id` is its start's record, or null for changes made before the first
// start in the window, as part of a session that started earlier.
export type ClaudeSession = {
  id: string | null;
  startedAt: Date;
  counts: { kind: RecordRef["kind"]; changes: number }[];
  listed: ActivityEntry[];
};

// Claude's changes, newest first as the log lists them, grouped into its sessions, newest first.
// Each start_session row opens a session, and each change after it belongs to it until the next
// start.
export function claudeSessions(entries: ActivityEntry[]): ClaudeSession[] {
  const sessions: ClaudeSession[] = [];
  // Oldest first, so each change lands in the session open when it was made.
  for (const entry of [...entries].reverse()) {
    if (entry.record.kind === "agent-session" && entry.action === "created") {
      sessions.push({
        id: entry.record.id,
        startedAt: entry.createdAt,
        counts: [],
        listed: [],
      });
      continue;
    }
    let current = sessions.at(-1);
    if (!current) {
      current = {
        id: null,
        startedAt: entry.createdAt,
        counts: [],
        listed: [],
      };
      sessions.push(current);
    }
    addTo(current, entry);
  }
  return sessions.reverse();
}

function addTo(session: ClaudeSession, entry: ActivityEntry): void {
  const count = session.counts.find(({ kind }) => kind === entry.record.kind);
  if (count) {
    count.changes += 1;
  } else {
    session.counts.push({ kind: entry.record.kind, changes: 1 });
  }
  if (entry.action === "refused" || closesAJob(entry)) {
    session.listed.push(entry);
  }
}

// A job's move to a closed status, which This week lists one by one.
function closesAJob(entry: ActivityEntry): boolean {
  return (
    entry.record.kind === "job" &&
    entry.changes.some(
      ({ field, after }) =>
        field === "status" &&
        (CLOSED_STATUSES as readonly JobStatus[]).includes(after as JobStatus),
    )
  );
}
