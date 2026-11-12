import { describe, expect, it } from "bun:test";
import {
  DEFAULT_SCORE,
  isExpired,
  priority,
  type Rankable,
  rankJobs,
} from "@/src/entities/rank";

const TODAY = "2026-01-20";

const job = (overrides: Partial<Rankable> & { id: string }): Rankable => ({
  status: "verify",
  pinnedAt: null,
  score: 7,
  tier: null,
  postedOn: "2026-01-15",
  foundOn: "2026-01-15",
  payMin: null,
  payMax: null,
  ...overrides,
});

const ids = (jobs: Rankable[]) => jobs.map(({ id }) => id);

describe("a job's priority (KTD23)", () => {
  it("starts from the fit score, or the default when there's none", () => {
    const base = job({ id: "a", postedOn: "2026-01-12" });
    expect(priority(base, TODAY, null)).toBe(7);
    expect(priority({ ...base, score: null }, TODAY, null)).toBe(DEFAULT_SCORE);
    expect(priority({ ...base, score: 9 }, TODAY, null)).toBe(9);
  });

  it("adds 2 for a tier 1 company and 1 for tier 2", () => {
    const base = job({ id: "a", postedOn: "2026-01-12" });
    expect(priority({ ...base, tier: 1 }, TODAY, null)).toBe(9);
    expect(priority({ ...base, tier: 2 }, TODAY, null)).toBe(8);
    expect(priority({ ...base, tier: 3 }, TODAY, null)).toBe(7);
  });

  it("adds 1 for a posting up to 3 days old and takes 1 away past 10 days", () => {
    const base = job({ id: "a" });
    expect(priority({ ...base, postedOn: "2026-01-17" }, TODAY, null)).toBe(8);
    expect(priority({ ...base, postedOn: "2026-01-16" }, TODAY, null)).toBe(7);
    expect(priority({ ...base, postedOn: "2026-01-10" }, TODAY, null)).toBe(7);
    expect(priority({ ...base, postedOn: "2026-01-09" }, TODAY, null)).toBe(6);
  });

  it("reads the day it was found when the posting gave no date", () => {
    const found = job({ id: "a", postedOn: null, foundOn: "2026-01-19" });
    expect(priority(found, TODAY, null)).toBe(8);
  });

  it("weighs the posted band against the floor, and adds nothing without one", () => {
    const base = job({ id: "a", postedOn: "2026-01-12" });
    const floor = 100_000;
    expect(
      priority({ ...base, payMin: 80_000, payMax: 95_000 }, TODAY, floor),
    ).toBe(5);
    expect(
      priority({ ...base, payMin: 100_000, payMax: 130_000 }, TODAY, floor),
    ).toBe(8);
    expect(
      priority({ ...base, payMin: 90_000, payMax: 120_000 }, TODAY, floor),
    ).toBe(7);
    expect(priority(base, TODAY, floor)).toBe(7);
    expect(
      priority({ ...base, payMin: 80_000, payMax: 95_000 }, TODAY, null),
    ).toBe(7);
  });
});

describe("an untouched job's expiry (KTD24)", () => {
  it("expires once its posting is more than 21 days old", () => {
    expect(isExpired(job({ id: "a", postedOn: "2025-12-30" }), TODAY)).toBe(
      false,
    );
    expect(isExpired(job({ id: "a", postedOn: "2025-12-29" }), TODAY)).toBe(
      true,
    );
  });

  it("never expires a pinned job, or one past the list's statuses", () => {
    const old = { postedOn: "2025-11-01" };
    expect(
      isExpired(job({ id: "a", ...old, pinnedAt: new Date() }), TODAY),
    ).toBe(false);
    expect(isExpired(job({ id: "a", ...old, status: "applied" }), TODAY)).toBe(
      false,
    );
    expect(isExpired(job({ id: "a", ...old, status: "target" }), TODAY)).toBe(
      true,
    );
  });

  it("reads the day it was found when the posting gave no date", () => {
    expect(
      isExpired(job({ id: "a", postedOn: null, foundOn: "2025-12-01" }), TODAY),
    ).toBe(true);
  });
});

describe("the ranked list (R27, KTD23)", () => {
  it("puts pinned jobs first, the latest pin first, then targets, then the rest by priority", () => {
    const list = rankJobs(
      [
        job({ id: "low", score: 4 }),
        job({ id: "target", status: "target", score: 3 }),
        job({ id: "high", score: 10 }),
        job({ id: "pinned-early", pinnedAt: new Date("2026-01-01T00:00:00Z") }),
        job({ id: "pinned-late", pinnedAt: new Date("2026-01-10T00:00:00Z") }),
      ],
      TODAY,
      null,
    );
    expect(ids(list)).toEqual([
      "pinned-late",
      "pinned-early",
      "target",
      "high",
      "low",
    ]);
  });

  it("leaves out expired jobs and jobs past the list's statuses", () => {
    const list = rankJobs(
      [
        job({ id: "fresh" }),
        job({ id: "expired", postedOn: "2025-12-01" }),
        job({ id: "applied", status: "applied" }),
        job({ id: "archived", status: "skipped" }),
      ],
      TODAY,
      null,
    );
    expect(ids(list)).toEqual(["fresh"]);
  });

  it("breaks ties by the newer posting, then the higher posted top, then the id", () => {
    const list = rankJobs(
      [
        job({ id: "b", postedOn: "2026-01-12", payMax: 100_000 }),
        job({ id: "a", postedOn: "2026-01-12", payMax: 100_000 }),
        job({ id: "c", postedOn: "2026-01-12", payMax: 150_000 }),
        job({ id: "d", postedOn: "2026-01-15" }),
      ],
      TODAY,
      null,
    );
    expect(ids(list)).toEqual(["d", "c", "a", "b"]);
  });
});
