import { describe, expect, it } from "bun:test";
import { type Migration, migrationPlan } from "@/scripts/lib/migrations";

describe("migrationPlan", () => {
  // A fictional journal of three migrations, a minute apart.
  const migrations: Migration[] = [
    { tag: "0000_activity", hash: "hash-0000", folderMillis: 1_000 },
    { tag: "0001_jobs", hash: "hash-0001", folderMillis: 61_000 },
    { tag: "0002_people", hash: "hash-0002", folderMillis: 121_000 },
  ];
  const tags = migrations.map(({ tag }) => tag);

  it("plans every migration when none is recorded", () => {
    expect(migrationPlan(migrations, [])).toEqual({
      applied: [],
      pending: tags,
      skipped: [],
      unknown: 0,
    });
  });

  it("plans the migrations newer than the newest recorded one", () => {
    expect(
      migrationPlan(migrations, [{ hash: "hash-0000", createdAt: 1_000 }]),
    ).toEqual({
      applied: ["0000_activity"],
      pending: ["0001_jobs", "0002_people"],
      skipped: [],
      unknown: 0,
    });
  });

  it("plans none when every migration is recorded", () => {
    const recorded = migrations.map(({ hash, folderMillis }) => ({
      hash,
      createdAt: folderMillis,
    }));
    expect(migrationPlan(migrations, recorded)).toEqual({
      applied: tags,
      pending: [],
      skipped: [],
      unknown: 0,
    });
  });

  it("names an unrecorded migration older than the newest recorded one, which drizzle skips", () => {
    // 0001 landed after 0002 had run, as when two branches each generate one.
    expect(
      migrationPlan(migrations, [
        { hash: "hash-0000", createdAt: 1_000 },
        { hash: "hash-0002", createdAt: 121_000 },
      ]),
    ).toEqual({
      applied: ["0000_activity", "0002_people"],
      pending: [],
      skipped: ["0001_jobs"],
      unknown: 0,
    });
  });

  it("counts recorded migrations the journal doesn't have", () => {
    expect(
      migrationPlan(migrations, [
        { hash: "another-apps-hash", createdAt: 500 },
      ]),
    ).toEqual({ applied: [], pending: tags, skipped: [], unknown: 1 });
  });
});
