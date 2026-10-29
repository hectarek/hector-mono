import { beforeEach, describe, expect, it } from "bun:test";
import { addJob, proposeJob } from "@/app/actions/jobs";
import { getToday, listProposals } from "@/app/actions/week";
import { newPosting } from "@/tests/_support/jobs";
import { nextState } from "@/tests/_support/next";
import { aCompany, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

beforeEach(() => {
  nextState.revalidated = [];
});

const proposal = (companyId: string) => ({
  companyId,
  role: `Proposed ${crypto.randomUUID().slice(0, 8)}`,
  postingUrl: newPosting(),
  source: "Widget Jobs",
  reason: "Matches the target role",
});

describe("getToday", () => {
  it("answers Claude's read with the week, and refreshes nothing", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const proposed = dataOf(await proposeJob(proposal(companyId)));
    nextState.revalidated = [];

    const view = dataOf(await getToday({}));

    expect(view.decisions.proposals.map(({ id }) => id)).toContain(proposed.id);
    expect(nextState.revalidated).toEqual([]);
  });

  it("answers `validation` for input that isn't an object", async () => {
    signInAs("owner");
    expect(await getToday("today")).toMatchObject({
      ok: false,
      code: "validation",
    });
  });

  it("refuses a signed-out read with `unauthenticated`", async () => {
    signInAs("signed-out");
    expect(await getToday({})).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});

describe("listProposals", () => {
  it("lists only the queue, whatever review state the input names (R20)", async () => {
    const companyId = await aCompany();
    signInAs("agent");
    const proposed = dataOf(await proposeJob(proposal(companyId)));
    signInAs("owner");
    const accepted = dataOf(
      await addJob({ companyId, role: "Widget engineer", source: "Referral" }),
    );

    const page = dataOf(
      await listProposals({ reviewState: "accepted", limit: 50 }),
    );

    const ids = page.jobs.map(({ id }) => id);
    expect(ids).toContain(proposed.id);
    expect(ids).not.toContain(accepted.id);
    expect(
      page.jobs.every(({ reviewState }) => reviewState === "pending"),
    ).toBe(true);
  });
});
