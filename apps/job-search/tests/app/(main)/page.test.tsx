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
  // R9: decisions first, then what's due.
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
    const dueSection = page.getByRole("region", { name: "Due" });
    expect(
      within(decisions).getByRole("link", { name: proposal.role }),
    ).toBeTruthy();
    expect(
      within(decisions).getAllByRole("button", { name: "Accept" }).length,
    ).toBeGreaterThan(0);
    expect(
      within(dueSection).getByRole("link", { name: due.role }),
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
    expect(page.queryByRole("link", { name: proposal.role })).toBeTruthy();
    const decisions = page.queryByRole("region", { name: "Decisions" });
    expect(
      decisions
        ? within(decisions).queryByRole("link", { name: proposal.role })
        : null,
    ).toBeNull();
    expect(page.queryByRole("link", { name: later.role })).toBeNull();
  });
});
