import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import { withFrom } from "@/app/_lib/back-link";
import JobsPage from "@/app/(main)/jobs/page";
import { closeJob, pinJob } from "@/app/actions/jobs";
import type { Redirected } from "@/tests/_support/next";
import { aClaudeJob, aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const jobsPage = async (params: Record<string, string> = {}) =>
  within(
    await renderOnServer(
      await JobsPage({ searchParams: Promise.resolve(params) }),
    ),
  );

describe("the jobs page", () => {
  it("lists open jobs by default, as a table and as cards", async () => {
    const companyId = await aCompany();
    const job = await aJob(companyId, {
      nextStep: "Ask for a referral",
      nextDate: "2026-11-02",
    });

    signInAs("owner");
    const page = await jobsPage();

    const table = within(page.getByRole("table"));
    expect(
      table.getByRole("link", { name: "Widget engineer" }).getAttribute("href"),
    ).toBe(withFrom(`/jobs/${job.id}`, "/jobs"));
    expect(table.getByText("Ask for a referral, due Nov 2, 2026")).toBeTruthy();
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

  // R27: the ranked list, with Pin and Not for me on each job.
  it("shows the ranked list under To apply, each job with its place, fit, reason, Pin and Not for me", async () => {
    const role = `Bolt fitter ${crypto.randomUUID().slice(0, 8)}`;
    const job = await aClaudeJob(await aCompany(), { role, score: 9 });
    signInAs("owner");
    // Pinned, it leads the list whatever this file added before.
    dataOf(await pinJob({ id: job.id, pinned: true }));

    const page = await jobsPage({ view: "to-apply" });

    expect(
      page
        .getByRole("button", { name: "To apply" })
        .getAttribute("aria-current"),
    ).toBe("page");
    const [, first] = within(page.getByRole("table")).getAllByRole("row");
    if (!first) throw new Error("No first row");
    const row = within(first);
    expect(row.getByText("1")).toBeTruthy();
    expect(row.getByRole("link", { name: role }).getAttribute("href")).toBe(
      withFrom(`/jobs/${job.id}`, "/jobs?view=to-apply"),
    );
    expect(row.getByText("Pinned")).toBeTruthy();
    expect(row.getByText("9/10")).toBeTruthy();
    expect(row.getByText("Matches the target role")).toBeTruthy();
    expect(row.getByRole("button", { name: `Unpin ${role}` })).toBeTruthy();
    expect(
      row.getByRole("button", { name: `Not for me: ${role}` }),
    ).toBeTruthy();
  });

  it("says so when a view is empty", async () => {
    signInAs("owner");
    const empty = await jobsPage({ view: "no-date" });
    expect(
      empty.getByText("Every open job's next step has a date."),
    ).toBeTruthy();
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await JobsPage({ searchParams: Promise.resolve({}) }).catch(
      (err: unknown) => err,
    );
    expect((outcome as Redirected).url).toBe("/private");
  });
});
