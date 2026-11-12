import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import TodayPage from "@/app/(main)/page";
import { closeJob, pinJob } from "@/app/actions/jobs";
import { getSettings, updateSettings } from "@/app/actions/settings";
import { getWeek, setWeekMilestone } from "@/app/actions/week";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aClaudeJob, aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const today = async () => within(await renderOnServer(await TodayPage()));

// Whether the second element comes after the first in the page.
const follows = (first: Element, second: Element) =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

describe("Today", () => {
  // R9 as revised 2026-11-10: the sections in its order. The job due today is on the pit board or
  // in a row under Needs you, whichever the run's other tests leave first; either is a button that
  // opens its sheet, found by the role the job carries. Needs you shows only when something's in
  // it.
  it("shows the week's line, the next task, what needs you, the ranked list's top and the week's counts, in that order", async () => {
    signInAs("owner");
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

    const page = await today();

    const title = page.getByRole("heading", { level: 1, name: "Today" });
    const week = page.getByRole("region", { name: "This week" });
    expect(within(week).getByText("Applications")).toBeTruthy();
    const nextTask = page.getByRole("region", { name: "Next task" });
    const needsYou = page.queryByRole("region", { name: /^Needs you/ });
    const applyNext = page.getByRole("region", { name: "Apply next" });
    const counts = page.getByRole("region", { name: "The week so far" });
    const dueButtons = [nextTask, needsYou].flatMap((region) =>
      region
        ? within(region).queryAllByRole("button", {
            name: new RegExp(due.role),
          })
        : [],
    );
    expect(dueButtons).toHaveLength(1);
    expect(
      within(applyNext).getAllByRole("link", { name: found.role }).length,
    ).toBeGreaterThan(0);
    expect(
      within(applyNext)
        .getByRole("button", { name: "The whole list" })
        .getAttribute("href"),
    ).toBe("/jobs?view=to-apply");
    expect(follows(title, week)).toBe(true);
    expect(follows(week, nextTask)).toBe(true);
    if (needsYou) {
      expect(follows(nextTask, needsYou)).toBe(true);
      expect(follows(needsYou, applyNext)).toBe(true);
    }
    expect(follows(nextTask, applyNext)).toBe(true);
    expect(follows(applyNext, counts)).toBe(true);
  });

  // R9 and R12 as revised 2026-11-10: once Hector sets a season, its track leads the page.
  it("shows the season's track above the week's line once a season is set", async () => {
    signInAs("owner");
    const day = todayIn(PLAN_TIME_ZONE);
    const read = dataOf(await getSettings({}));
    dataOf(
      await updateSettings({
        targets: read.targets,
        payFloor: read.payFloor,
        seasonStart: addDays(day, -10),
        seasonFinish: addDays(day, 80),
        checkpoints: [{ on: addDays(day, 20), name: "Five screens" }],
        updatedAt: read.updatedAt?.toISOString() ?? null,
      }),
    );

    const page = await today();

    const track = page.getByRole("img", { name: /^The season as a track/ });
    expect(track.getAttribute("aria-label")).toContain(
      "Today is day 11 of sector 1 of 2, which ends at",
    );
    expect(
      follows(track, page.getByRole("region", { name: "This week" })),
    ).toBe(true);
  });

  // R10 as revised 2026-11-10: the milestone Monday's planning set joins the week's line.
  it("shows this week's milestone in the week's line once planning sets it", async () => {
    signInAs("agent");
    const week = dataOf(await getWeek({}));
    dataOf(
      await setWeekMilestone({
        week: week.week,
        milestone: "Ship the fictional widget",
        updatedAt: week.plan?.updatedAt.toISOString() ?? null,
      }),
    );
    signInAs("owner");

    const page = await today();

    const line = within(page.getByRole("region", { name: "This week" }));
    expect(line.getByText("Milestone")).toBeTruthy();
    expect(line.getByText("Ship the fictional widget")).toBeTruthy();
  });

  // R27: Hector pins, and Claude on his word, so its session has both.
  it("shows Claude's session Apply next with Pin and Not for me", async () => {
    const found = await aClaudeJob(await aCompany(), {
      role: `Found ${crypto.randomUUID().slice(0, 8)}`,
    });
    signInAs("owner");
    dataOf(await pinJob({ id: found.id, pinned: true }));
    signInAs("agent");

    const page = await today();

    const applyNext = within(page.getByRole("region", { name: "Apply next" }));
    expect(
      applyNext.getAllByRole("button", { name: `Unpin ${found.role}` }).length,
    ).toBeGreaterThan(0);
    expect(
      applyNext.getAllByRole("button", { name: `Not for me: ${found.role}` })
        .length,
    ).toBeGreaterThan(0);
  });

  it("leaves a job passed on out of Apply next, and a job due tomorrow out of the next task and Needs you", async () => {
    signInAs("owner");
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

    const page = await today();

    expect(page.queryAllByRole("link", { name: found.role })).toEqual([]);
    // Not yet applied to, the job due tomorrow is on the ranked list too, whose buttons name it
    // after Pin and Not for me; its own rows start with its role. Due tomorrow, it's under Later
    // this week, folded, if tomorrow is this week; never due yet.
    const rows = page.queryAllByRole("button", {
      name: new RegExp(`^${later.role}`),
      hidden: true,
    });
    expect(rows.every((row) => row.closest("details"))).toBe(true);
    const nextTask = page.getByRole("region", { name: "Next task" });
    expect(
      within(nextTask).queryAllByRole("button", {
        name: new RegExp(later.role),
      }),
    ).toEqual([]);
  });
});
