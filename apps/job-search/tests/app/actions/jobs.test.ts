import { beforeEach, describe, expect, it } from "bun:test";
import { saveCompany } from "@/app/actions/companies";
import {
  addJob,
  closeJob,
  deleteJob,
  findJobs,
  getJob,
  pinJob,
  setJobStatus,
  updateJob,
} from "@/app/actions/jobs";
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

beforeEach(() => {
  nextState.revalidated = [];
});

// The test container lives for the whole run, so each test has a company of its own.
const aCompany = async () => {
  signInAs("owner");
  return dataOf(
    await saveCompany({ name: `Acme ${crypto.randomUUID().slice(0, 8)}` }),
  ).company.id;
};

// add_job's input as Claude sends it.
const claudesJob = (
  companyId: string,
  input: Record<string, unknown> = {},
) => ({
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

describe("addJob", () => {
  it("puts Claude's job on the ranked list, logged as Claude's through the tool, and refreshes the pages that show it", async () => {
    const companyId = await aCompany();
    nextState.revalidated = [];
    signInAs("agent");

    const job = dataOf(
      await addJob(claudesJob(companyId, { score: 8 }), "add_job"),
    );

    expect(job).toMatchObject({
      status: "verify",
      reason: "Matches the target role",
      score: 8,
    });
    expect(await history(job.id)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "add_job",
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
    expect(
      dataOf(await findJobs({ status: "to-apply", companyId })).jobs,
    ).toEqual([expect.objectContaining({ id: job.id })]);
  });

  it("adds Hector's job from the form, its link and reason optional", async () => {
    const companyId = await aCompany();

    expect(
      dataOf(
        await addJob({
          companyId,
          role: "Widget engineer",
          source: "Referral",
        }),
      ),
    ).toMatchObject({ status: "verify", reason: null, nextStep: null });
  });

  // R20, KTD3: Claude's job always carries its posting's link and its reason.
  it("answers Claude's add without a link or a reason with `validation`", async () => {
    const companyId = await aCompany();
    signInAs("agent");

    expect(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    ).toMatchObject({
      ok: false,
      code: "validation",
      message: "A job Claude adds needs the posting's link and a reason.",
    });
  });

  it("answers a posting already on a job with `duplicate` and that job", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const posting = newPosting();
    const first = dataOf(
      await addJob(claudesJob(companyId, { postingUrl: posting })),
    );

    expect(
      await addJob(
        claudesJob(companyId, { postingUrl: `${posting}?utm_source=feed` }),
      ),
    ).toMatchObject({
      ok: false,
      code: "duplicate",
      current: { id: first.id, status: "verify" },
    });
  });

  it("answers a link that isn't http or https with `validation`, naming the field", async () => {
    signInAs("agent");
    expect(
      await addJob(
        claudesJob(await aCompany(), { postingUrl: "javascript:alert(1)" }),
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

  it("move a job to applied with no follow-up of its own, and point a closed status to close_job", async () => {
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
      nextStep: null,
      nextDate: null,
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

describe("pinJob", () => {
  it("pins Claude's way through the tool, refreshing the pages that show it, and unpins", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const job = dataOf(await addJob(claudesJob(companyId)));
    nextState.revalidated = [];

    const pinned = dataOf(
      await pinJob({ id: job.id, pinned: true }, "pin_job"),
    );

    expect(pinned.pinnedAt).toBeInstanceOf(Date);
    expect(nextState.revalidated).toContain("/jobs");
    const [logged] = await history(job.id);
    expect(logged).toMatchObject({ actor: "agent", tool: "pin_job" });
    expect(
      dataOf(await pinJob({ id: job.id, pinned: false })).pinnedAt,
    ).toBeNull();
  });

  it("answers a pin of a job applied to with `validation`", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    dataOf(await setJobStatus({ id: job.id, status: "applied" }));

    expect(await pinJob({ id: job.id, pinned: true })).toMatchObject({
      ok: false,
      code: "validation",
    });
  });
});

describe("an archived job", () => {
  // AE2 as revised 2026-11-10.
  it("refuses Claude's move back to an open status with `human-only`, logs it, and changes nothing", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const job = dataOf(await addJob(claudesJob(companyId)));
    signInAs("owner");
    const archived = dataOf(
      await closeJob({ id: job.id, status: "skipped", reason: "Not a fit" }),
    );

    signInAs("agent");
    expect(
      await setJobStatus({ id: job.id, status: "verify" }, "set_job_status"),
    ).toEqual({
      ok: false,
      code: "human-only",
      message: "Only Hector can do this.",
    });
    signInAs("owner");
    expect(dataOf(await getJob({ id: job.id })).job).toEqual(archived);
    const [refusal] = await history(job.id);
    expect(refusal).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "reopen",
    });
  });

  it("moves back to the list Hector's way", async () => {
    const companyId = await aCompany();
    const job = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );
    dataOf(
      await closeJob({ id: job.id, status: "skipped", reason: "Not a fit" }),
    );

    expect(
      dataOf(await setJobStatus({ id: job.id, status: "verify" })),
    ).toMatchObject({ status: "verify" });
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
