import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import { withFrom } from "@/app/_lib/back-link";
import JobsPage from "@/app/(main)/jobs/page";
import { closeJob } from "@/app/actions/jobs";
import type { Redirected } from "@/tests/_support/next";
import { aCompany, aJob, aProposal, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const jobsPage = async (params: Record<string, string> = {}) =>
  within(
    await renderOnServer(
      await JobsPage({ searchParams: Promise.resolve(params) }),
    ),
  );

describe("the jobs page", () => {
  it("lists open jobs by default, as a table and as cards, and counts the proposals waiting", async () => {
    const companyId = await aCompany();
    const job = await aJob(companyId, {
      nextStep: "Ask for a referral",
      nextDate: "2026-11-02",
    });
    await aProposal(companyId);

    signInAs("owner");
    const page = await jobsPage();

    const table = within(page.getByRole("table"));
    expect(
      table.getByRole("link", { name: "Widget engineer" }).getAttribute("href"),
    ).toBe(withFrom(`/jobs/${job.id}`, "/jobs"));
    expect(table.getByText("Ask for a referral, due Nov 2, 2026")).toBeTruthy();
    expect(table.queryByText("Gadget designer")).toBeNull();
    expect(page.getByRole("button", { name: "To review (1)" })).toBeTruthy();
    expect(
      page.getByRole("button", { name: "Open" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      page.getByRole("button", { name: "Add job" }).getAttribute("href"),
    ).toBe("/jobs/new");
  });

  // The UX plan's Q6: every ended job is under Archived, and Closed is the posting's status alone.
  it("lists every ended job under Archived", async () => {
    const role = `Bolt tester ${crypto.randomUUID().slice(0, 8)}`;
    const job = await aJob(await aCompany(), { role });
    signInAs("owner");
    dataOf(
      await closeJob({
        id: job.id,
        status: "closed",
        reason: "Posting closed",
      }),
    );

    const page = await jobsPage({ view: "archived" });

    expect(
      page
        .getByRole("button", { name: "Archived" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      within(page.getByRole("table")).getByRole("link", { name: role }),
    ).toBeTruthy();
  });

  it("shows the review queue, and says so when a view is empty", async () => {
    signInAs("owner");
    const empty = await jobsPage({ view: "dismissed" });
    expect(empty.getByText("No dismissed proposals.")).toBeTruthy();

    const proposal = await aProposal(await aCompany(), {
      role: "Bolt fitter",
    });
    signInAs("owner");
    const queue = await jobsPage({ view: "review" });
    expect(
      within(queue.getByRole("table"))
        .getByRole("link", { name: "Bolt fitter" })
        .getAttribute("href"),
    ).toBe(withFrom(`/jobs/${proposal.id}`, "/jobs?view=review"));
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await JobsPage({ searchParams: Promise.resolve({}) }).catch(
      (err: unknown) => err,
    );
    expect((outcome as Redirected).url).toBe("/private");
  });
});
