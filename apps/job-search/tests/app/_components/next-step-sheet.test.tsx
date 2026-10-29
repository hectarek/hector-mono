import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextStepSheet } from "@/app/_components/next-step-sheet";
import { getJob, updateJob } from "@/app/actions/jobs";
import { addPerson, getPerson } from "@/app/actions/people";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "Change" }));

describe("a due row's next step", () => {
  it("moves a job's next date, and the sheet closes", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-01-05",
    });
    signInAs("owner");
    render(<NextStepSheet kind="job" record={job} name={job.role} />);

    open();
    fireEvent.change(screen.getByLabelText("Next date"), {
      target: { value: "2026-01-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        nextStep: "Call back",
        nextDate: "2026-01-12",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull(),
    );
  });

  it("clears a job's next step and date", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-01-05",
    });
    signInAs("owner");
    render(<NextStepSheet kind="job" record={job} name={job.role} />);

    open();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        nextStep: null,
        nextDate: null,
      }),
    );
  });

  it("logs a sent message to a person and moves their next date to what was typed (R8)", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({
        name: `Ada ${crypto.randomUUID().slice(0, 8)}`,
        nextStep: "Follow up",
        nextDate: "2026-01-05",
      }),
    );
    render(<NextStepSheet kind="person" record={person} name={person.name} />);

    open();
    fireEvent.change(screen.getByLabelText("Next date"), {
      target: { value: "2026-01-19" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log sent" }));

    await waitFor(async () =>
      expect(dataOf(await getPerson({ id: person.id })).person).toMatchObject({
        messagedOn: todayIn(PLAN_TIME_ZONE),
        nextStep: "Follow up",
        nextDate: "2026-01-19",
      }),
    );
  });

  // KTD15: Claude changes the job while Hector's sheet is open.
  it("keeps what Hector typed on a conflict, and shows Claude's change beside it", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-01-05",
    });
    signInAs("owner");
    render(<NextStepSheet kind="job" record={job} name={job.role} />);
    open();
    fireEvent.change(screen.getByLabelText("Next date"), {
      target: { value: "2026-01-12" },
    });

    signInAs("agent");
    dataOf(
      await updateJob({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
        nextStep: "Send the form",
      }),
    );
    signInAs("owner");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Changed since you opened this"),
    ).toBeTruthy();
    expect(screen.getByText("Next step is now Send the form")).toBeTruthy();
    expect(screen.getByLabelText("Next date")).toHaveProperty(
      "value",
      "2026-01-12",
    );
    expect(screen.getByLabelText("Next step")).toHaveProperty(
      "value",
      "Send the form",
    );
    expect((await jobOf(job.id)).nextDate).toBe("2026-01-05");
  });
});
