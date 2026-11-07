import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import ThisWeekPage from "@/app/(main)/page";
import { acceptProposal } from "@/app/actions/jobs";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aCompany, aJob, aProposal, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const thisWeek = async () => within(await renderOnServer(await ThisWeekPage()));

describe("This week", () => {
  // R9: decisions first, then what's due. The job due today is on the pit board or in a row,
  // whichever the run's other tests leave first; either is a button that opens its sheet, found
  // by the role the job carries.
  it("shows Claude's proposal under Decisions before what's due, and a job due today under Due", async () => {
    const companyId = await aCompany();
    const proposal = await aProposal(companyId, {
      role: `Proposed ${crypto.randomUUID().slice(0, 8)}`,
    });
    const due = await aJob(companyId, {
      role: `Due ${crypto.randomUUID().slice(0, 8)}`,
      nextStep: "Call back",
      nextDate: todayIn(PLAN_TIME_ZONE),
    });
    signInAs("owner");

    const page = await thisWeek();

    const decisions = page.getByRole("region", { name: "Decisions" });
    const dueSection = page.getByRole("region", {
      name: /^Due today and late · \d+$/,
    });
    expect(
      within(decisions).getByRole("link", { name: proposal.role }),
    ).toBeTruthy();
    expect(
      within(decisions).getAllByRole("button", { name: "Accept" }).length,
    ).toBeGreaterThan(0);
    expect(
      within(dueSection).getByRole("button", { name: new RegExp(due.role) }),
    ).toBeTruthy();
    expect(
      decisions.compareDocumentPosition(dueSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(page.getByRole("region", { name: "The week so far" })).toBeTruthy();
  });

  it("shows Claude's session a proposal's buttons off, as only Hector's (KTD3)", async () => {
    const proposal = await aProposal(await aCompany(), {
      role: `Proposed ${crypto.randomUUID().slice(0, 8)}`,
    });
    signInAs("agent");

    const page = await thisWeek();

    const decisions = within(page.getByRole("region", { name: "Decisions" }));
    expect(decisions.getByRole("link", { name: proposal.role })).toBeTruthy();
    expect(decisions.getAllByText("Only Hector").length).toBeGreaterThan(0);
  });

  it("leaves a proposal out once Hector accepts it, and a job due tomorrow out of Due", async () => {
    const companyId = await aCompany();
    const proposal = await aProposal(companyId, {
      role: `Accepted ${crypto.randomUUID().slice(0, 8)}`,
    });
    const later = await aJob(companyId, {
      role: `Later ${crypto.randomUUID().slice(0, 8)}`,
      nextStep: "Prepare",
      nextDate: addDays(todayIn(PLAN_TIME_ZONE), 1),
    });
    signInAs("owner");
    dataOf(
      await acceptProposal({
        id: proposal.id,
        updatedAt: proposal.updatedAt.toISOString(),
      }),
    );

    const page = await thisWeek();

    // Accepted, it's due today, to check it's still hiring (R20).
    expect(
      page.queryByRole("button", { name: new RegExp(proposal.role) }),
    ).toBeTruthy();
    const decisions = page.queryByRole("region", { name: "Decisions" });
    expect(
      decisions
        ? within(decisions).queryByRole("link", { name: proposal.role })
        : null,
    ).toBeNull();
    // Due tomorrow, it's under Later this week, folded, if tomorrow is this week; never due yet.
    const rows = page.queryAllByRole("button", {
      name: new RegExp(later.role),
      hidden: true,
    });
    expect(rows.every((row) => row.closest("details"))).toBe(true);
  });
});
