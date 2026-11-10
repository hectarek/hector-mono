import { afterEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { NotForMe } from "@/app/_components/not-for-me";
import { APP_TOASTER } from "@/app/_lib/notify";
import { getJob } from "@/app/actions/jobs";
import type { Job } from "@/src/entities/models/job.model";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

const sheet = (job: Job, human = true) =>
  render(
    <>
      <NotForMe job={job} human={human} />
      <Toaster id={APP_TOASTER} />
    </>,
  );

const open = (job: Job) =>
  fireEvent.click(
    screen.getByRole("button", { name: `Not for me: ${job.role}` }),
  );

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  toast.dismiss();
});

describe("Not for me (R20 as revised 2026-11-10)", () => {
  it("archives a job as skipped with a reason in one tap, says so, and puts it back on Undo", async () => {
    const job = await aJob(await aCompany(), {
      nextStep: "Read the team page",
      nextDate: "2026-12-01",
    });
    sheet(job);

    open(job);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Pay too low",
      }),
    );

    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        status: "skipped",
        nextStep: null,
      }),
    );
    expect(
      await screen.findByText(`Not for me: ${job.role}. Pay too low.`),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(async () =>
      expect(await jobOf(job.id)).toMatchObject({
        status: "verify",
        nextStep: "Read the team page",
        nextDate: "2026-12-01",
      }),
    );
  });

  it("archives with a reason typed, saved by the form's submit", async () => {
    const job = await aJob(await aCompany());
    sheet(job);

    open(job);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Another reason"), {
      target: { value: "Too far to commute" },
    });
    const form = dialog
      .getByRole("button", { name: "Archive with that reason" })
      .closest("form");
    if (!form) throw new Error("The sheet isn't a form");
    fireEvent.submit(form);

    await waitFor(async () =>
      expect((await jobOf(job.id)).status).toBe("skipped"),
    );
  });

  // R21: moving it back is Hector's, so Claude's toast has no Undo.
  it("offers Claude's session no Undo", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    sheet(job, false);

    open(job);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Not a fit",
      }),
    );

    expect(
      await screen.findByText(`Not for me: ${job.role}. Not a fit.`),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});
