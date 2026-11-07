import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DueList } from "@/app/_components/due-list";
import { getJob } from "@/app/actions/jobs";
import { jobSummary } from "@/src/entities/models/job.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const NOTHING_DUE = { jobs: [], people: [], stale: [], practice: [] };

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

describe("what's due on This week", () => {
  it("puts the earliest task on the pit board, and the rest in rows that say when they're due", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const companyId = await aCompany();
    const dueToday = await aJob(companyId, {
      nextStep: "Send the portfolio",
      nextDate: today,
    });
    const late = await aJob(companyId, {
      nextStep: "Call back",
      nextDate: addDays(today, -2),
    });
    signInAs("owner");

    const view = render(
      <DueList
        due={{
          ...NOTHING_DUE,
          jobs: [jobSummary(dueToday), jobSummary(late)],
        }}
        today={today}
        waiting={0}
      />,
    );

    const [board, row, ...others] = view.getAllByRole("link");
    expect(others).toEqual([]);
    expect(board?.textContent).toContain("Next up · 2 days late");
    expect(board?.textContent).toContain("Call back");
    expect(row?.textContent).toContain("Send the portfolio");
    expect(row?.textContent).toContain("Today");
    // Each keeps its one action: the next step's sheet.
    expect(view.getAllByRole("button", { name: "Change" })).toHaveLength(2);
  });

  it("opens the board's sheet on the task that's next now, and saves to it, once the task before it is done", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const companyId = await aCompany();
    const first = await aJob(companyId, {
      nextStep: "Call back",
      nextDate: addDays(today, -2),
    });
    const second = await aJob(companyId, {
      nextStep: "Send the portfolio",
      nextDate: addDays(today, -1),
    });
    signInAs("owner");
    const view = render(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [jobSummary(first), jobSummary(second)] }}
        today={today}
        waiting={0}
      />,
    );

    // The first task is done, so the page refreshes with the second on the board.
    view.rerender(
      <DueList
        due={{ ...NOTHING_DUE, jobs: [jobSummary(second)] }}
        today={today}
        waiting={0}
      />,
    );
    fireEvent.click(view.getByRole("button", { name: "Change" }));

    // The sheet renders in a portal, outside the board's container.
    expect(screen.getByLabelText("Next step")).toHaveProperty(
      "value",
      "Send the portfolio",
    );
    fireEvent.change(screen.getByLabelText("Next date"), {
      target: { value: addDays(today, 3) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () =>
      expect((await jobOf(second.id)).nextDate).toBe(addDays(today, 3)),
    );
    expect(await jobOf(first.id)).toMatchObject({
      nextStep: "Call back",
      nextDate: addDays(today, -2),
    });
  });

  it("says when nothing is due, and points at the decisions waiting", () => {
    const view = render(
      <DueList due={NOTHING_DUE} today="2026-11-06" waiting={1} />,
    );

    expect(view.getByText("Nothing due today")).toBeTruthy();
    expect(view.getByText("1 decision waits for you above.")).toBeTruthy();
    expect(view.queryByRole("link")).toBeNull();
  });
});
