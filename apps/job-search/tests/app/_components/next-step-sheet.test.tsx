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
import {
  type NextStepRecord,
  NextStepSheet,
} from "@/app/_components/next-step-sheet";
import { getJob, setJobStatus, updateJob } from "@/app/actions/jobs";
import { addPerson, getPerson } from "@/app/actions/people";
import { getToday } from "@/app/actions/week";
import type { JobStage } from "@/src/entities/job-lifecycle";
import type { PersonRef } from "@/src/entities/models/person.model";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

// Thursday, Nov 5, 10 am Eastern: tomorrow is Nov 6, in 3 days Nov 8, next Monday Nov 9, and in a
// week Nov 12.
const THURSDAY = new Date("2026-11-05T15:00:00Z");

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;
const personOf = async (id: string) => dataOf(await getPerson({ id })).person;
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

// The sheet as This week's row opens it, with the toaster the shell mounts.
const sheet = (
  kind: "job" | "person",
  record: NextStepRecord,
  extra: {
    job?: Pick<JobStage, "status" | "appliedOn">;
    contacts?: PersonRef[];
  } = {},
) =>
  render(
    <>
      <NextStepSheet
        kind={kind}
        record={record}
        title="A task"
        detail={`${record.nextStep} · due`}
        {...extra}
      />
      <Toaster />
    </>,
  );

// The sheet renders in a portal, outside the trigger's container.
const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
const tap = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  setSystemTime(THURSDAY);
});

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  setSystemTime();
  toast.dismiss();
});

describe("a due row's sheet: Push", () => {
  it("pushes a task to tomorrow in two taps, says so, and puts it back on Undo", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-11-03",
    });
    signInAs("owner");
    sheet("job", job);

    open();
    tap(/^Push to tomorrow/);

    await waitFor(async () =>
      expect((await jobOf(job.id)).nextDate).toBe("2026-11-06"),
    );
    expect(await screen.findByText(/Pushed to Nov 6, 2026/)).toBeTruthy();

    tap("Undo");
    await waitFor(async () =>
      expect((await jobOf(job.id)).nextDate).toBe("2026-11-03"),
    );
  });

  it("pushes to another day from the date field, saved by the form's submit (Enter, or the phone's Go)", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-11-03",
    });
    signInAs("owner");
    sheet("job", job);

    open();
    const field = screen.getByLabelText("Another day");
    fireEvent.change(field, { target: { value: "2026-11-20" } });
    const form = field.closest("form");
    if (!form) throw new Error("The sheet isn't a form");
    fireEvent.submit(form);

    await waitFor(async () =>
      expect((await jobOf(job.id)).nextDate).toBe("2026-11-20"),
    );
  });
});

describe("a due row's sheet: Done", () => {
  it("finishes a person's task in three taps: logs a sent message, which the week counts, and follows up a week out (Q2)", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({
        name: fictional("Ada"),
        nextStep: "Ask for the intro",
        nextDate: "2026-11-03",
      }),
    );
    const sent = async () => dataOf(await getToday({})).counts.messagesSent;
    const before = await sent();
    sheet("person", person);

    open();
    tap("Done");
    tap("Save");

    await waitFor(async () =>
      expect(await personOf(person.id)).toMatchObject({
        messagedOn: "2026-11-05",
        nextStep: "Follow up",
        nextDate: "2026-11-12",
      }),
    );
    expect(await screen.findByText(/Logged: Message sent/)).toBeTruthy();
    expect(await sent()).toBe(before + 1);
  });

  it("logs a reply instead and leaves no next step", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({
        name: fictional("Ada"),
        nextStep: "Ask for the intro",
        nextDate: "2026-11-03",
      }),
    );
    sheet("person", person);

    open();
    tap("Done");
    tap("Reply");
    tap("No next step");

    await waitFor(async () =>
      expect(await personOf(person.id)).toMatchObject({
        repliedOn: "2026-11-05",
        nextStep: null,
        nextDate: null,
      }),
    );
  });

  it("puts a person's step back and deletes the logged message on Undo", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({
        name: fictional("Ada"),
        nextStep: "Ask for the intro",
        nextDate: "2026-11-03",
      }),
    );
    sheet("person", person);
    open();
    tap("Done");
    tap("Save");
    await screen.findByText(/Logged: Message sent/);

    tap("Undo");

    await waitFor(async () =>
      expect(await personOf(person.id)).toMatchObject({
        messagedOn: null,
        nextStep: "Ask for the intro",
        nextDate: "2026-11-03",
      }),
    );
  });

  describe("for an applied job", () => {
    // Applied Oct 27, so its follow-up was due Nov 3 (R3).
    async function appliedJob() {
      const job = await aJob(await aCompany());
      dataOf(
        await setJobStatus({ id: job.id, status: "applied", on: "2026-10-27" }),
      );
      const pat = dataOf(
        await addPerson({ name: fictional("Pat"), jobId: job.id }),
      );
      return { job: await jobOf(job.id), pat };
    }

    it("logs a follow-up to a contact in one tap, linked to the job, which moves its date a week out (R3, Q5)", async () => {
      signInAs("owner");
      const { job, pat } = await appliedJob();
      sheet("job", job, { job, contacts: [pat] });

      open();
      tap("Done");
      tap(pat.name);

      // Applied-on + 14 is Nov 10; the follow-up went late, so a week after it is later.
      await waitFor(async () =>
        expect((await jobOf(job.id)).nextDate).toBe("2026-11-12"),
      );
      expect((await personOf(pat.id)).messagedOn).toBe("2026-11-05");
      expect(dataOf(await getPerson({ id: pat.id })).interactions).toEqual([
        expect.objectContaining({ jobId: job.id }),
      ]);
    });

    it("deletes the follow-up and puts the job's date back on Undo", async () => {
      signInAs("owner");
      const { job, pat } = await appliedJob();
      sheet("job", job, { job, contacts: [pat] });
      open();
      tap("Done");
      tap(pat.name);
      await screen.findByText(/Logged a follow-up to/);

      tap("Undo");

      await waitFor(async () =>
        expect((await jobOf(job.id)).nextDate).toBe("2026-11-03"),
      );
      expect(dataOf(await getPerson({ id: pat.id })).interactions).toEqual([]);
    });

    it("notes a follow-up sent through the portal and moves the date the same way (Q3)", async () => {
      signInAs("owner");
      const { job } = await appliedJob();
      sheet("job", job, { job, contacts: [] });

      open();
      tap("Done");
      tap("Through the portal");

      await waitFor(async () =>
        expect((await jobOf(job.id)).nextDate).toBe("2026-11-12"),
      );
      expect(dataOf(await getJob({ id: job.id })).notes).toEqual([
        expect.objectContaining({ body: "Followed up through the portal." }),
      ]);
    });
  });

  // KTD15: Claude changes the job while Hector's sheet is open.
  it("keeps what Hector typed on a conflict, and shows Claude's change beside it", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Call back",
      nextDate: "2026-11-03",
    });
    signInAs("owner");
    sheet("job", job);
    open();
    tap("Done");
    fireEvent.change(screen.getByLabelText("What's next?"), {
      target: { value: "Send the deck" },
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
    tap("Save");

    expect(
      await screen.findByText("Changed since you opened this"),
    ).toBeTruthy();
    expect(screen.getByText("Next step is now Send the form")).toBeTruthy();
    expect(screen.getByLabelText("What's next?")).toHaveProperty(
      "value",
      "Send the deck",
    );
    expect((await jobOf(job.id)).nextStep).toBe("Send the form");
  });
});

describe("a due row's sheet given another record", () => {
  it("starts over on it, so it can't save to the one before", async () => {
    const companyId = await aCompany();
    const before = await aJob(companyId, {
      nextStep: "Call back",
      nextDate: "2026-11-03",
    });
    const after = await aJob(companyId, {
      nextStep: "Send the portfolio",
      nextDate: "2026-11-04",
    });
    signInAs("owner");
    const view = sheet("job", before);
    view.rerender(
      <>
        <NextStepSheet
          kind="job"
          record={after}
          title="A task"
          detail={`${after.nextStep} · due`}
        />
        <Toaster />
      </>,
    );

    open();
    expect(
      within(screen.getByRole("dialog")).getByText("Send the portfolio · due"),
    ).toBeTruthy();
    tap(/^Push to tomorrow/);

    await waitFor(async () =>
      expect((await jobOf(after.id)).nextDate).toBe("2026-11-06"),
    );
    expect((await jobOf(before.id)).nextDate).toBe("2026-11-03");
  });
});
