import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { HumanOnlyError, InputParseError } from "@/src/entities/errors/common";
import type { Job, ReviewState } from "@/src/entities/models/job.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("reviewProposal", () => {
  let app: TestApp;
  let proposal: Job;

  beforeEach(async () => {
    setSystemTime(new Date("2026-10-26T16:00:00Z"));
    app = makeApp();
    const jobs = jobFixtures(app);
    proposal = await jobs.propose(await jobs.company());
  });

  afterEach(() => {
    setSystemTime();
  });

  const listed = async (reviewState: ReviewState) =>
    (await app.findJobs(OWNER, { reviewState, limit: 20, offset: 0 })).jobs.map(
      (job) => job.id,
    );

  it("Hector accepts: in the pipeline at verify, with checking it's hiring due today", async () => {
    const accepted = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      decision: "accept",
    });

    expect(accepted).toMatchObject({
      reviewState: "accepted",
      status: "verify",
      nextStep: "Verify it's hiring",
      nextDate: "2026-10-26",
    });
    expect(await listed("accepted")).toEqual([proposal.id]);
    expect(await listed("pending")).toEqual([]);
  });

  it("Hector dismisses with a reason: listed under dismissed, with it; reopened, pending again", async () => {
    const dismissed = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      decision: "dismiss",
      reason: "wrong-level",
      note: "Too junior",
    });
    expect(dismissed).toMatchObject({
      reviewState: "dismissed",
      dismissReason: "wrong-level",
      dismissNote: "Too junior",
    });
    expect(await listed("dismissed")).toEqual([proposal.id]);

    const reopened = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      decision: "reopen",
    });
    expect(reopened).toMatchObject({
      reviewState: "pending",
      dismissReason: null,
      dismissNote: null,
    });
    expect(await listed("pending")).toEqual([proposal.id]);
  });

  // AE2.
  it("refuses Claude's accept with HumanOnlyError, logs the refusal, and changes nothing", async () => {
    await expect(
      app.reviewProposal(CLAUDE, { id: proposal.id, decision: "accept" }),
    ).rejects.toBeInstanceOf(HumanOnlyError);

    expect((await app.getJob(OWNER, { id: proposal.id })).job).toEqual(
      proposal,
    );
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: proposal.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "accept",
    });
  });

  it("refuses a decision that doesn't fit where the proposal stands", async () => {
    await app.reviewProposal(HECTOR, { id: proposal.id, decision: "accept" });

    await expect(
      app.reviewProposal(HECTOR, { id: proposal.id, decision: "accept" }),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      app.reviewProposal(HECTOR, { id: proposal.id, decision: "reopen" }),
    ).rejects.toThrow("Only a dismissed proposal can be reopened.");
  });
});
