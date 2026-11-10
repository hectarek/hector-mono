import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import ThisWeekPage from "@/app/(main)/page";
import { closeJob, pinJob } from "@/app/actions/jobs";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aClaudeJob, aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const thisWeek = async () => within(await renderOnServer(await ThisWeekPage()));

describe("This week", () => {
  // R9: what's due, then the top of the ranked list (R27). The job due today is on the pit board
  // or in a row, whichever the run's other tests leave first; either is a button that opens its
  // sheet, found by the role the job carries.
  it("shows a job due today under Due, then the ranked list's top under Apply next", async () => {
    const companyId = await aCompany();
    const found = await aClaudeJob(companyId, {
      role: `Found ${crypto.randomUUID().slice(0, 8)}`,
    });
    const due = await aJob(companyId, {
      role: `Due ${crypto.randomUUID().slice(0, 8)}`,
      nextStep: "Call back",
      nextDate: todayIn(PLAN_TIME_ZONE),
    });
    // Pinned, it tops the list whatever this file added before.
    dataOf(await pinJob({ id: found.id, pinned: true }));

    const page = await thisWeek();

    const dueSection = page.getByRole("region", {
      name: /^Due today and late · \d+$/,
    });
    const applyNext = page.getByRole("region", { name: "Apply next" });
    expect(
      within(dueSection).getByRole("button", { name: new RegExp(due.role) }),
    ).toBeTruthy();
    expect(
      within(applyNext).getAllByRole("link", { name: found.role }).length,
    ).toBeGreaterThan(0);
    expect(
      within(applyNext)
        .getByRole("button", { name: "The whole list" })
        .getAttribute("href"),
    ).toBe("/jobs?view=to-apply");
    expect(
      dueSection.compareDocumentPosition(applyNext) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(page.getByRole("region", { name: "The week so far" })).toBeTruthy();
  });

  // R27: Hector pins, and Claude on his word, so its session has both.
  it("shows Claude's session Apply next with Pin and Not for me", async () => {
    const found = await aClaudeJob(await aCompany(), {
      role: `Found ${crypto.randomUUID().slice(0, 8)}`,
    });
    signInAs("owner");
    dataOf(await pinJob({ id: found.id, pinned: true }));
    signInAs("agent");

    const page = await thisWeek();

    const applyNext = within(page.getByRole("region", { name: "Apply next" }));
    expect(
      applyNext.getAllByRole("button", { name: `Unpin ${found.role}` }).length,
    ).toBeGreaterThan(0);
    expect(
      applyNext.getAllByRole("button", { name: `Not for me: ${found.role}` })
        .length,
    ).toBeGreaterThan(0);
  });

  it("leaves a job passed on out of Apply next, and a job due tomorrow out of Due", async () => {
    const companyId = await aCompany();
    const found = await aClaudeJob(companyId, {
      role: `Passed ${crypto.randomUUID().slice(0, 8)}`,
    });
    const later = await aJob(companyId, {
      role: `Later ${crypto.randomUUID().slice(0, 8)}`,
      nextStep: "Prepare",
      nextDate: addDays(todayIn(PLAN_TIME_ZONE), 1),
    });
    dataOf(await pinJob({ id: found.id, pinned: true }));
    dataOf(
      await closeJob({ id: found.id, status: "skipped", reason: "Not a fit" }),
    );

    const page = await thisWeek();

    expect(page.queryAllByRole("link", { name: found.role })).toEqual([]);
    // Due tomorrow, it's under Later this week, folded, if tomorrow is this week; never due yet.
    // Not yet applied to, it's on the ranked list too, so only Due's rows count here.
    const rows = within(
      page.getByRole("region", { name: /^Due today and late/ }),
    ).queryAllByRole("button", { name: new RegExp(later.role), hidden: true });
    expect(rows.every((row) => row.closest("details"))).toBe(true);
  });
});
