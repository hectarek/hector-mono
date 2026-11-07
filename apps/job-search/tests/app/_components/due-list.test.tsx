import { describe, expect, it } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DueList } from "@/app/_components/due-list";
import { getJob } from "@/app/actions/jobs";
import { type Job, jobSummary } from "@/src/entities/models/job.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const NOTHING_DUE = { jobs: [], people: [], stale: [], practice: [] };
const NOTHING_LATER = { jobs: [], people: [] };

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

// A job as This week lists it, with its contacts (none here).
const listed = (job: Job) => ({ ...jobSummary(job), contacts: [] });

// Jobs due on the days given, from today, each with a next step that names its day.
async function jobsDue(offsets: number[]) {
  const today = todayIn(PLAN_TIME_ZONE);
  const companyId = await aCompany();
  return Promise.all(
    offsets.map((offset, index) =>
      aJob(companyId, {
        nextStep: `Step ${index + 1}`,
        nextDate: addDays(today, offset),
      }),
    ),
  );
}

describe("what's due on This week", () => {
  it("puts the earliest task on the pit board when none matters more, and the rest in rows grouped late and today", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [late, onToday] = await jobsDue([-2, 0]);
    if (!late || !onToday) throw new Error("No jobs");

    const view = render(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [listed(onToday), listed(late)] }}
        later={NOTHING_LATER}
        today={today}
        waiting={0}
      />,
    );

    const [board, row, ...others] = view.getAllByRole("button");
    expect(others).toEqual([]);
    expect(board?.textContent).toContain("Next up · 2 days late");
    expect(board?.textContent).toContain("Step 1");
    // Each row is one tap that names its record, marked as a job, and says when it's due.
    expect(row?.textContent).toContain("Job · Step 2");
    expect(row?.textContent).toContain("Today");
    expect(view.getByRole("heading", { name: "Today · 1" })).toBeTruthy();
    expect(view.queryByRole("heading", { name: /^Late/ })).toBeNull();
  });

  it("gives the board to the job whose company matters most, even when another is later", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [late] = await jobsDue([-3]);
    const tierOne = await aCompany("Wanted", { tier: 1 });
    const wanted = await aJob(tierOne, {
      nextStep: "Send the deck",
      nextDate: today,
    });
    if (!late) throw new Error("No job");

    const view = render(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [listed(late), listed(wanted)] }}
        later={NOTHING_LATER}
        today={today}
        waiting={0}
      />,
    );

    const [board] = view.getAllByRole("button");
    expect(board?.textContent).toContain("Send the deck");
    expect(view.getByRole("heading", { name: "Late · 1" })).toBeTruthy();
  });

  it("shows five late tasks, and folds the rest under Show more", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const late = await jobsDue([-8, -7, -6, -5, -4, -3, -2]);

    const view = render(
      <DueList
        due={{ ...NOTHING_DUE, jobs: late.map(listed) }}
        later={NOTHING_LATER}
        today={today}
        waiting={0}
      />,
    );

    // The earliest is on the board, so six are left: five show and one folds.
    expect(view.getByRole("heading", { name: "Late · 6" })).toBeTruthy();
    expect(view.getByText("Show 1 more")).toBeTruthy();
    expect(view.container.querySelectorAll("details li")).toHaveLength(1);
  });

  it("folds what's due later this week under each day", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [soon] = await jobsDue([1]);
    if (!soon) throw new Error("No job");

    const view = render(
      <DueList
        due={NOTHING_DUE}
        later={{ jobs: [listed(soon)], people: [] }}
        today={today}
        waiting={0}
      />,
    );

    expect(view.getByText("Later this week · 1")).toBeTruthy();
    expect(view.getByText("Nothing due today")).toBeTruthy();
  });

  it("opens the board's sheet on the task that's next now, and saves to it, once the task before it is done", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [first, second] = await jobsDue([-2, -1]);
    if (!first || !second) throw new Error("No jobs");
    signInAs("owner");
    const view = render(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [listed(first), listed(second)] }}
        later={NOTHING_LATER}
        today={today}
        waiting={0}
      />,
    );

    // The first task is done, so the page refreshes with the second on the board.
    view.rerender(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [listed(second)] }}
        later={NOTHING_LATER}
        today={today}
        waiting={0}
      />,
    );
    const [board] = view.getAllByRole("button");
    if (!board) throw new Error("No board");
    fireEvent.click(board);

    // The sheet renders in a portal, outside the board's container.
    expect(
      within(screen.getByRole("dialog")).getByText(/^Step 2/),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Another day"), {
      target: { value: addDays(today, 3) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Push to that day" }));

    await waitFor(async () =>
      expect((await jobOf(second.id)).nextDate).toBe(addDays(today, 3)),
    );
    expect((await jobOf(first.id)).nextDate).toBe(addDays(today, -2));
  });

  it("says when nothing is due, and points at the decisions waiting", () => {
    const view = render(
      <DueList
        due={NOTHING_DUE}
        later={NOTHING_LATER}
        today="2026-11-06"
        waiting={1}
      />,
    );

    expect(view.getByText("Nothing due today")).toBeTruthy();
    expect(view.getByText("1 decision waits for you above.")).toBeTruthy();
    expect(view.queryByRole("button")).toBeNull();
  });
});
