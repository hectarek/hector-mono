import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  ConflictError,
  HumanOnlyError,
  InputParseError,
} from "@/src/entities/errors/common";
import {
  type Job,
  type ReviewState,
  updateJobSchema,
} from "@/src/entities/models/job.model";
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

  // Claude changes the proposal after Hector read it.
  const changedByClaude = (job: Job) =>
    app.updateJob(
      CLAUDE,
      updateJobSchema.parse({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
        summary: "A fictional summary Claude added.",
      }),
    );

  it("Hector accepts: in the pipeline at verify, with checking it's hiring due today", async () => {
    const accepted = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      updatedAt: proposal.updatedAt,
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
      updatedAt: proposal.updatedAt,
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
      updatedAt: dismissed.updatedAt,
      decision: "reopen",
    });
    expect(reopened).toMatchObject({
      reviewState: "pending",
      dismissReason: null,
      dismissNote: null,
    });
    expect(await listed("pending")).toEqual([proposal.id]);
  });

  // R22, revised 2026-10-29.
  it("refuses each decision on a proposal Claude changed since Hector read it, with it as it is now", async () => {
    const changed = await changedByClaude(proposal);

    for (const decision of [
      { decision: "accept" },
      { decision: "dismiss", reason: "not-hiring", note: null },
    ] as const) {
      const refused = await app
        .reviewProposal(HECTOR, {
          id: proposal.id,
          updatedAt: proposal.updatedAt,
          ...decision,
        })
        .catch((error: unknown) => error);
      expect(refused).toBeInstanceOf(ConflictError);
      expect((refused as ConflictError).current).toEqual(changed);
    }
    expect(await listed("pending")).toEqual([proposal.id]);

    const dismissed = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      updatedAt: changed.updatedAt,
      decision: "dismiss",
      reason: "not-hiring",
      note: null,
    });
    await expect(
      app.reviewProposal(HECTOR, {
        id: proposal.id,
        updatedAt: changed.updatedAt,
        decision: "reopen",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect((await app.getJob(OWNER, { id: proposal.id })).job).toEqual(
      dismissed,
    );
  });

  // AE2.
  it("refuses Claude's accept with HumanOnlyError, logs the refusal, and changes nothing", async () => {
    await expect(
      app.reviewProposal(CLAUDE, {
        id: proposal.id,
        updatedAt: proposal.updatedAt,
        decision: "accept",
      }),
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
    const accepted = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      updatedAt: proposal.updatedAt,
      decision: "accept",
    });

    await expect(
      app.reviewProposal(HECTOR, {
        id: proposal.id,
        updatedAt: accepted.updatedAt,
        decision: "accept",
      }),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      app.reviewProposal(HECTOR, {
        id: proposal.id,
        updatedAt: accepted.updatedAt,
        decision: "reopen",
      }),
    ).rejects.toThrow("Only a dismissed proposal can be reopened.");
  });
});
