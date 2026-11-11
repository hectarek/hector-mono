import { describe, expect, it } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  dueTasks,
  LaterThisWeek,
  NeedsYou,
  NextTask,
} from "@/app/_components/due-list";
import { logInteraction } from "@/app/actions/interactions";
import { getJob } from "@/app/actions/jobs";
import { addPerson } from "@/app/actions/people";
import { type Job, jobSummary } from "@/src/entities/models/job.model";
import type {
  ConversationToDebrief,
  TodayView,
} from "@/src/entities/models/today.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const NOTHING_DUE = { jobs: [], people: [], stale: [], practice: [] };
const NOTHING_LATER = { jobs: [], people: [] };
const NONE_UNDATED = { jobs: 0, people: 0 };

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

// A job as Today lists it, with its contacts (none here).
const listed = (job: Job) => ({ ...jobSummary(job), contacts: [] });

// Today's three sections of what's due, as the page puts them: the next task, what needs Hector
// and the rest of the week.
function DueSections({
  due,
  later,
  undated,
  today,
  waiting,
  stale = [],
  debriefs = [],
}: {
  due: TodayView["due"];
  later: TodayView["later"];
  undated: TodayView["undated"];
  today: string;
  waiting: number;
  stale?: TodayView["due"]["stale"];
  debriefs?: ConversationToDebrief[];
}) {
  const tasks = dueTasks(due, later, today);
  return (
    <>
      <NextTask tasks={tasks} today={today} waiting={waiting} />
      <NeedsYou
        tasks={tasks}
        stale={stale}
        debriefs={debriefs}
        undated={undated}
        today={today}
      />
      <LaterThisWeek tasks={tasks} today={today} />
    </>
  );
}

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

describe("what's due on Today", () => {
  it("puts the earliest task on the pit board when none matters more, and the rest in rows grouped late and today", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [late, onToday] = await jobsDue([-2, 0]);
    if (!late || !onToday) throw new Error("No jobs");

    const view = render(
      <DueSections
        due={{ ...NOTHING_DUE, jobs: [listed(onToday), listed(late)] }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
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
      <DueSections
        due={{ ...NOTHING_DUE, jobs: [listed(late), listed(wanted)] }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
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
      <DueSections
        due={{ ...NOTHING_DUE, jobs: late.map(listed) }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
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
      <DueSections
        due={NOTHING_DUE}
        later={{ jobs: [listed(soon)], people: [] }}
        undated={NONE_UNDATED}
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
      <DueSections
        due={{ ...NOTHING_DUE, jobs: [listed(first), listed(second)] }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
        today={today}
        waiting={0}
      />,
    );

    // The first task is done, so the page refreshes with the second on the board.
    view.rerender(
      <DueSections
        due={{ ...NOTHING_DUE, jobs: [listed(second)] }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
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
      <DueSections
        due={NOTHING_DUE}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
        today="2026-11-06"
        waiting={1}
      />,
    );

    expect(view.getByText("Nothing due today")).toBeTruthy();
    expect(view.getByText("1 decision waits for you below.")).toBeTruthy();
    expect(view.queryByRole("region", { name: /^Needs you/ })).toBeNull();
    expect(view.queryByRole("button")).toBeNull();
  });

  // R9 as revised 2026-11-10: the steps the board doesn't hold, under Needs you with its count.
  it("lists under Needs you what the board doesn't hold, and leaves the board's task out", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const [late, onToday] = await jobsDue([-2, 0]);
    if (!late || !onToday) throw new Error("No jobs");

    const view = render(
      <DueSections
        due={{ ...NOTHING_DUE, jobs: [listed(late), listed(onToday)] }}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
        today={today}
        waiting={0}
      />,
    );

    const nextTask = view.getByRole("region", { name: "Next task" });
    const needsYou = view.getByRole("region", { name: "Needs you · 1" });
    expect(within(nextTask).getByRole("button").textContent).toContain(
      "Step 1",
    );
    expect(within(needsYou).getAllByRole("button")).toHaveLength(1);
    expect(within(needsYou).getByRole("button").textContent).toContain(
      "Step 2",
    );
  });

  // R9 as revised 2026-11-10: a conversation to debrief is something that needs Hector.
  it("puts a conversation to debrief under Needs you, and counts it", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({ name: `Grace ${crypto.randomUUID().slice(0, 8)}` }),
    );
    const [conversation] = dataOf(
      await logInteraction({
        personIds: [person.id],
        kind: "conversation",
        scheduled: {
          startsAt: "2026-01-05T14:00:00-05:00",
          endsAt: "2026-01-05T14:30:00-05:00",
        },
      }),
    ).interactions;
    if (!conversation) throw new Error("No conversation was logged");

    const view = render(
      <DueSections
        due={NOTHING_DUE}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
        today="2026-11-06"
        waiting={1}
        debriefs={[
          {
            conversation,
            person: {
              id: person.id,
              name: person.name,
              role: null,
              rank: null,
            },
          },
        ]}
      />,
    );

    const needsYou = view.getByRole("region", { name: "Needs you · 1" });
    expect(
      within(needsYou).getByRole("heading", { name: "Debrief · 1" }),
    ).toBeTruthy();
    expect(within(needsYou).getByRole("button", { name: "Held" })).toBeTruthy();
    expect(view.getByText("1 decision waits for you below.")).toBeTruthy();
  });

  // R9 as revised 2026-11-07 (the UX plan's UX6).
  it("counts the steps with no date, each count a link to the list that dates them, and says nothing when there are none", () => {
    const view = render(
      <DueSections
        due={NOTHING_DUE}
        later={NOTHING_LATER}
        undated={{ jobs: 1, people: 3 }}
        today="2026-11-06"
        waiting={0}
      />,
    );

    expect(
      view
        .getByRole("link", { name: "3 people whose next step has no date" })
        .getAttribute("href"),
    ).toBe("/people?view=no-date");
    expect(
      view
        .getByRole("link", { name: "1 job whose next step has no date" })
        .getAttribute("href"),
    ).toBe("/jobs?view=no-date");

    view.rerender(
      <DueSections
        due={NOTHING_DUE}
        later={NOTHING_LATER}
        undated={NONE_UNDATED}
        today="2026-11-06"
        waiting={0}
      />,
    );
    expect(view.queryByText("No date")).toBeNull();
  });
});
