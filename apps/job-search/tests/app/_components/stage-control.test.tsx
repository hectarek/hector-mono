import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { StageControl } from "@/app/_components/stage-control";
import { APP_TOASTER } from "@/app/_lib/notify";
import { getJob, setJobStatus } from "@/app/actions/jobs";
import { addPerson, getPerson } from "@/app/actions/people";
import type { Job } from "@/src/entities/models/job.model";
import type { PersonRef } from "@/src/entities/models/person.model";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

// Monday, Nov 9, 10 am Eastern.
const MONDAY = new Date("2026-11-09T15:00:00Z");
const TODAY = "2026-11-09";

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

const control = (job: Job, contacts: PersonRef[] = []) =>
  render(
    <>
      <StageControl
        job={{ id: job.id, status: job.status, appliedOn: job.appliedOn }}
        contacts={contacts}
        today={TODAY}
      />
      <Toaster id={APP_TOASTER} />
    </>,
  );

const tap = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const submitSheet = () => {
  const form = within(screen.getByRole("dialog")).getByRole("button", {
    name: /^Move to|^Close with/,
  });
  const element = form.closest("form");
  if (!element) throw new Error("The sheet isn't a form");
  fireEvent.submit(element);
};

beforeEach(() => {
  setSystemTime(MONDAY);
});

afterEach(() => {
  setSystemTime();
  toast.dismiss();
});

describe("the stage control (the UX plan's UX9)", () => {
  it("marks the stage the job is at, shades the ones passed, and moves it on a tap", async () => {
    const job = await aJob(await aCompany());
    dataOf(await setJobStatus({ id: job.id, status: "applied" }));
    control(await jobOf(job.id));

    expect(
      screen
        .getByRole("button", { name: "Applied" })
        .getAttribute("aria-current"),
    ).toBe("step");
    expect(
      screen
        .getByRole("button", { name: "Screen" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("moves to Screen with the stage's step prefilled, so no old Follow up stays due", async () => {
    const job = await aJob(await aCompany());
    dataOf(await setJobStatus({ id: job.id, status: "applied" }));
    control(await jobOf(job.id));

    tap("Screen");
    expect(screen.getByLabelText("Next step")).toHaveProperty(
      "value",
      "Prepare for the screen",
    );
    expect(screen.getByLabelText("Next date")).toHaveProperty(
      "value",
      "2026-11-11",
    );
    submitSheet();

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        status: "screen",
        nextStep: "Prepare for the screen",
        nextDate: "2026-11-11",
      }),
    );
    expect(
      await screen.findByText(
        "Moved to Screen. Next: Prepare for the screen, Nov 11, 2026.",
      ),
    ).toBeTruthy();
  });

  it("saves the step as changed, and moves its date with the move's until the step is changed", async () => {
    const job = await aJob(await aCompany());
    control(job);

    tap("Target");
    fireEvent.change(screen.getByLabelText("On"), {
      target: { value: "2026-11-05" },
    });
    expect(screen.getByLabelText("Next date")).toHaveProperty(
      "value",
      "2026-11-07",
    );
    fireEvent.change(screen.getByLabelText("Next step"), {
      target: { value: "Tailor the résumé" },
    });
    submitSheet();

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        status: "target",
        nextStep: "Tailor the résumé",
        nextDate: "2026-11-07",
      }),
    );
  });

  it("closes with a reason chip in two taps", async () => {
    const job = await aJob(await aCompany());
    control(job);

    tap("Close…");
    tap(/^After the screen: close as rejected/);

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        status: "rejected",
        nextStep: null,
      }),
    );
    expect(
      await screen.findByText("Closed as Rejected: After the screen."),
    ).toBeTruthy();
  });

  it("closes with a reason typed, under the status picked", async () => {
    const job = await aJob(await aCompany());
    control(job);

    tap("Close…");
    tap("Withdrawn");
    fireEvent.change(screen.getByLabelText("Another reason"), {
      target: { value: "The team was reorganized" },
    });
    submitSheet();

    await waitFor(async () =>
      expect((await jobOf(job.id)).status).toBe("withdrawn"),
    );
  });

  it("after a close, lists the contacts with a next step, each with No next step", async () => {
    const companyId = await aCompany();
    const job = await aJob(companyId);
    signInAs("owner");
    const person = dataOf(
      await addPerson({
        name: `Ada ${crypto.randomUUID().slice(0, 8)}`,
        companyId,
        jobId: job.id,
        nextStep: "Ask about the team",
        nextDate: "2026-11-12",
      }),
    );
    control(job, [
      { id: person.id, name: person.name, role: null, rank: null },
    ]);

    tap("Close…");
    tap(/^Posting closed: close as closed/);

    expect(
      await screen.findByText("Ask about the team · Nov 12, 2026"),
    ).toBeTruthy();
    tap(`No next step for ${person.name}`);
    await waitFor(async () =>
      expect(dataOf(await getPerson({ id: person.id })).person).toMatchObject({
        nextStep: null,
        nextDate: null,
      }),
    );
    expect(await screen.findByText("Cleared")).toBeTruthy();
  });
});
