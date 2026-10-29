import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { saveCompany } from "@/app/actions/companies";
import {
  acceptProposal,
  addJob,
  closeJob,
  deleteJob,
  dismissProposal,
  findJobs,
  getJob,
  proposeJob,
  reopenProposal,
  setJobStatus,
  updateJob,
} from "@/app/actions/jobs";
import { updateSettings } from "@/app/actions/settings";
import type { ActionResult } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { newPosting } from "@/tests/_support/jobs";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.code}`);
  }
  return result.data;
}

// The test container lives for the whole run: room in the queue for this file's proposals,
// whatever another file left the cap at, and a company of each test's own.
beforeAll(async () => {
  signInAs("owner");
  const read = await getInjection("IGetSettingsController")(HECTOR);
  dataOf(
    await updateSettings({
      targets: read.targets,
      pendingCap: 50,
      updatedAt: read.updatedAt?.toISOString() ?? null,
    }),
  );
});

beforeEach(() => {
  nextState.revalidated = [];
});

const aCompany = async () => {
  signInAs("owner");
  return dataOf(
    await saveCompany({ name: `Acme ${crypto.randomUUID().slice(0, 8)}` }),
  ).company.id;
};

const proposal = (companyId: string, input: Record<string, unknown> = {}) => ({
  companyId,
  role: "Widget engineer",
  postingUrl: newPosting(),
  source: "Widget Jobs",
  reason: "Matches the target role",
  ...input,
});

const history = async (id: string) =>
  (
    await getInjection("IListActivityController")(
      { record: { kind: "job", id } },
      HECTOR,
    )
  ).entries;

describe("proposeJob", () => {
  it("leaves Claude's proposal pending, logged as Claude's through the tool, and refreshes the pages that show it", async () => {
    const companyId = await aCompany();
    nextState.revalidated = [];
    signInAs("agent");

    const job = dataOf(await proposeJob(proposal(companyId), "propose_job"));

    expect(job).toMatchObject({ reviewState: "pending", status: "verify" });
    expect(await history(job.id)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "propose_job",
        action: "created",
      }),
    ]);
    expect(nextState.revalidated).toEqual([
      "/",
      "/jobs",
      `/jobs/${job.id}`,
      `/companies/${companyId}`,
      "/agent",
    ]);
  });

  it("answers a posting already on a job with `duplicate` and that job", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const posting = newPosting();
    const first = dataOf(
      await proposeJob(proposal(companyId, { postingUrl: posting })),
    );

    expect(
      await proposeJob(
        proposal(companyId, { postingUrl: `${posting}?utm_source=feed` }),
      ),
    ).toMatchObject({
      ok: false,
      code: "duplicate",
      current: { id: first.id, reviewState: "pending" },
    });
  });

  it("answers a link that isn't http or https with `validation`, naming the field", async () => {
    signInAs("agent");
    expect(
      await proposeJob(
        proposal(await aCompany(), { postingUrl: "javascript:alert(1)" }),
      ),
    ).toEqual({
      ok: false,
      code: "validation",
      message:
        "Posting link: Use an http or https link, like https://example.com",
      fields: {
        postingUrl: "Use an http or https link, like https://example.com",
      },
    });
  });
});

describe("a job's changes", () => {
  it("add Hector's job accepted at once", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    expect(job.reviewState).toBe("accepted");
  });

  // R20, KTD3: the form's add from Claude's session would be a proposal with no link or reason.
  it("answer Claude's add through the job form with `validation`, pointing to propose_job", async () => {
    const companyId = await aCompany();
    signInAs("agent");

    expect(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    ).toMatchObject({
      ok: false,
      code: "validation",
      message:
        "A proposal needs the posting's link and a reason: use propose_job.",
    });
  });

  it("answer Claude's update against an old updatedAt with `conflict` and the job as it is now, and its applied-on with `validation`", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    const read = job.updatedAt.toISOString();
    const hectors = dataOf(
      await updateJob({ id: job.id, updatedAt: read, location: "Springfield" }),
    );

    signInAs("agent");
    expect(
      await updateJob(
        { id: job.id, updatedAt: read, location: "Shelbyville" },
        "update_job",
      ),
    ).toEqual({
      ok: false,
      code: "conflict",
      message: "This changed since it was read.",
      current: hectors,
    });
    expect(
      await updateJob({
        id: job.id,
        updatedAt: hectors.updatedAt.toISOString(),
        appliedOn: "2026-10-20",
      }),
    ).toMatchObject({ ok: false, code: "validation" });
  });

  it("move a job to applied with the follow-up, and point a closed status to close_job", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    signInAs("agent");

    const applied = dataOf(
      await setJobStatus({ id: job.id, status: "applied" }, "set_job_status"),
    );
    expect(applied).toMatchObject({
      status: "applied",
      nextStep: "Follow up",
    });
    const pointed = await setJobStatus({ id: job.id, status: "rejected" });
    expect(pointed).toMatchObject({ ok: false, code: "validation" });
    expect(pointed.ok ? "" : pointed.message).toContain("close_job");
  });

  it("close a job only with a reason, clearing its next step", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    signInAs("agent");

    expect(
      await closeJob({ id: job.id, status: "withdrawn" }, "close_job"),
    ).toMatchObject({
      ok: false,
      code: "validation",
      fields: { reason: expect.any(String) },
    });
    expect(
      dataOf(
        await closeJob(
          { id: job.id, status: "withdrawn", reason: "Took another path" },
          "close_job",
        ),
      ),
    ).toMatchObject({ status: "withdrawn", nextStep: null, nextDate: null });
  });
});

describe("Hector's review", () => {
  // AE2.
  it("refuses Claude's accept with `human-only`, logs it, and changes nothing", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const job = dataOf(await proposeJob(proposal(companyId)));

    expect(
      await acceptProposal({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
      }),
    ).toEqual({
      ok: false,
      code: "human-only",
      message: "Only Hector can do this.",
    });
    signInAs("owner");
    expect(dataOf(await getJob({ id: job.id })).job).toEqual(job);
    const [refusal] = await history(job.id);
    expect(refusal).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "accept",
    });
  });

  it("accepts, dismisses with a reason and reopens Hector's way", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const first = dataOf(await proposeJob(proposal(companyId)));
    const second = dataOf(await proposeJob(proposal(companyId)));
    signInAs("owner");

    expect(
      dataOf(
        await acceptProposal({
          id: first.id,
          updatedAt: first.updatedAt.toISOString(),
        }),
      ),
    ).toMatchObject({
      reviewState: "accepted",
      nextStep: "Verify it's hiring",
    });
    const dismissed = dataOf(
      await dismissProposal({
        id: second.id,
        updatedAt: second.updatedAt.toISOString(),
        reason: "pay-too-low",
      }),
    );
    expect(dismissed).toMatchObject({
      reviewState: "dismissed",
      dismissReason: "pay-too-low",
    });
    expect(
      dataOf(
        await reopenProposal({
          id: second.id,
          updatedAt: dismissed.updatedAt.toISOString(),
        }),
      ),
    ).toMatchObject({ reviewState: "pending" });
  });

  // R22, revised 2026-10-29.
  it("answers `conflict` with the proposal as it is now when Claude changed it since Hector read it", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const job = dataOf(await proposeJob(proposal(companyId)));
    const changed = dataOf(
      await updateJob({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
        summary: "A fictional summary Claude added.",
      }),
    );
    signInAs("owner");

    const answer = await acceptProposal({
      id: job.id,
      updatedAt: job.updatedAt.toISOString(),
    });

    expect(answer).toMatchObject({ ok: false, code: "conflict" });
    expect(answer.ok ? undefined : answer.current).toEqual(changed);
    expect(dataOf(await getJob({ id: job.id })).job.reviewState).toBe(
      "pending",
    );
  });
});

describe("deleteJob", () => {
  it("refuses Claude with `human-only`, and deletes Hector's way", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );

    signInAs("agent");
    expect(await deleteJob({ id: job.id })).toMatchObject({
      ok: false,
      code: "human-only",
    });
    signInAs("owner");
    nextState.revalidated = [];
    expect(dataOf(await deleteJob({ id: job.id }))).toEqual({
      id: job.id,
      role: "Widget engineer",
      companyId,
    });
    expect(await getJob({ id: job.id })).toMatchObject({
      ok: false,
      code: "not-found",
    });
    expect(nextState.revalidated).toEqual([
      "/",
      "/jobs",
      `/jobs/${job.id}`,
      `/companies/${companyId}`,
      "/agent",
    ]);
  });
});

describe("findJobs and getJob", () => {
  it("answer Claude's session with the company's jobs and a job's detail", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );

    signInAs("agent");
    expect(dataOf(await findJobs({ companyId })).jobs).toEqual([
      expect.objectContaining({ id: job.id, role: "Widget engineer" }),
    ]);
    expect(dataOf(await getJob({ id: job.id }))).toMatchObject({
      job: { id: job.id },
      notes: [],
      moves: [],
    });
  });

  it("answer a session the app can't act for with its code", async () => {
    signInAs("stranger");
    expect(await findJobs({})).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await getJob({ id: crypto.randomUUID() })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});
