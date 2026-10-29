import { describe, expect, it } from "bun:test";
import { claudeSessions } from "@/src/entities/claude-sessions";
import type { ActivityEntry } from "@/src/entities/models/activity.model";

let next = 0;
const entry = (overrides: Partial<ActivityEntry>): ActivityEntry => {
  next += 1;
  return {
    id: next,
    createdAt: new Date(Date.UTC(2026, 9, 28, 12, next)),
    actor: "agent",
    tool: null,
    record: {
      kind: "job",
      id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
    },
    action: "updated",
    changes: [],
    reason: null,
    ...overrides,
  };
};
const start = () =>
  entry({
    record: { kind: "agent-session", id: crypto.randomUUID() },
    action: "created",
  });

describe("claudeSessions", () => {
  it("groups each change into the session open when it was made, newest first", () => {
    const morning = start();
    const note = entry({
      record: { kind: "note", id: crypto.randomUUID() },
      action: "created",
    });
    const afternoon = start();
    const job = entry({});
    const person = entry({
      record: { kind: "person", id: crypto.randomUUID() },
    });
    // The log lists the newest first.
    const sessions = claudeSessions([person, job, afternoon, note, morning]);

    expect(sessions.map(({ id, startedAt }) => [id, startedAt])).toEqual([
      [afternoon.record.id, afternoon.createdAt],
      [morning.record.id, morning.createdAt],
    ]);
    expect(sessions[0]?.counts).toEqual([
      { kind: "job", changes: 1 },
      { kind: "person", changes: 1 },
    ]);
    expect(sessions[1]?.counts).toEqual([{ kind: "note", changes: 1 }]);
  });

  it("lists a job's closing move and a refused attempt one by one, and counts them too", () => {
    const closing = entry({
      changes: [{ field: "status", before: "applied", after: "rejected" }],
    });
    const moving = entry({
      changes: [{ field: "status", before: "applied", after: "screen" }],
    });
    const refused = entry({ action: "refused", reason: "accept" });

    const [session] = claudeSessions([refused, moving, closing, start()]);

    expect(session?.listed).toEqual([closing, refused]);
    expect(session?.counts).toEqual([{ kind: "job", changes: 3 }]);
  });

  it("keeps changes made before the window's first start in a session with no id, from its first change", () => {
    const early = entry({});
    const later = start();

    const sessions = claudeSessions([later, early]);

    expect(sessions.map(({ id }) => id)).toEqual([later.record.id, null]);
    expect(sessions[1]).toMatchObject({
      startedAt: early.createdAt,
      counts: [{ kind: "job", changes: 1 }],
    });
  });
});
