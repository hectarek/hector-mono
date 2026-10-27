import { describe, expect, it } from "bun:test";
import {
  acceptedStage,
  afterMove,
  isClosed,
  isStaleCandidate,
  type JobStage,
} from "@/src/entities/job-lifecycle";

const TARGET: JobStage = {
  status: "target",
  appliedOn: null,
  nextStep: "Tailor the résumé",
  nextDate: "2026-10-20",
};

describe("a status move", () => {
  // AE3.
  it("to applied fills an empty applied-on with the move's date, and sets the follow-up 7 days after it", () => {
    expect(afterMove(TARGET, "applied", "2026-10-25")).toEqual({
      status: "applied",
      appliedOn: "2026-10-25",
      nextStep: "Follow up",
      nextDate: "2026-11-01",
    });
  });

  it("to applied keeps an applied-on already set, and follows up from it", () => {
    expect(
      afterMove(
        { ...TARGET, appliedOn: "2026-10-01" },
        "applied",
        "2026-10-25",
      ),
    ).toEqual({
      status: "applied",
      appliedOn: "2026-10-01",
      nextStep: "Follow up",
      nextDate: "2026-10-08",
    });
  });

  it("past applied for the first time fills applied-on too, and leaves the next step as it was", () => {
    expect(afterMove(TARGET, "screen", "2026-10-25")).toEqual({
      ...TARGET,
      status: "screen",
      appliedOn: "2026-10-25",
    });
  });

  it("to a closed status clears the next step and next date, and fills no applied-on", () => {
    expect(afterMove(TARGET, "rejected", "2026-10-25")).toEqual({
      status: "rejected",
      appliedOn: null,
      nextStep: null,
      nextDate: null,
    });
  });

  // R2: any move is allowed.
  it("goes anywhere, a closed job reopening included", () => {
    const stale: JobStage = {
      status: "stale",
      appliedOn: "2026-09-01",
      nextStep: null,
      nextDate: null,
    };
    expect(afterMove(stale, "screen", "2026-10-25")).toEqual({
      ...stale,
      status: "screen",
    });
    expect(
      afterMove({ ...TARGET, status: "offer" }, "verify", "2026-10-25"),
    ).toMatchObject({ status: "verify" });
  });

  it("answers with where the job stands alone, whatever else the job it's given holds", () => {
    const job = { ...TARGET, id: "a job", role: "Widget engineer" };
    expect(Object.keys(afterMove(job, "screen", "2026-10-25")).sort()).toEqual([
      "appliedOn",
      "nextDate",
      "nextStep",
      "status",
    ]);
  });

  it("tells closed statuses from open ones", () => {
    expect(isClosed("offer-declined")).toBe(true);
    expect(isClosed("offer")).toBe(false);
  });
});

describe("accepting a proposal (R20)", () => {
  it("puts it in verify, with the next step to verify it's hiring, due the day it's accepted", () => {
    expect(acceptedStage("2026-10-26")).toEqual({
      status: "verify",
      nextStep: "Verify it's hiring",
      nextDate: "2026-10-26",
    });
  });
});

describe("a stale candidate (R3)", () => {
  const applied = { status: "applied" as const, appliedOn: "2026-10-01" };

  it("is a job still applied to 21 days after applied-on", () => {
    expect(isStaleCandidate(applied, "2026-10-22")).toBe(true);
    expect(isStaleCandidate(applied, "2026-10-21")).toBe(false);
  });

  it("is no longer one once a move takes it past applied", () => {
    expect(
      isStaleCandidate({ ...applied, status: "screen" }, "2026-11-30"),
    ).toBe(false);
  });
});
