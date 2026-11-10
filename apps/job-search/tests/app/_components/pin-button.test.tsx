import { afterEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { PinButton } from "@/app/_components/pin-button";
import { APP_TOASTER } from "@/app/_lib/notify";
import { getJob, setJobStatus } from "@/app/actions/jobs";
import type { Job } from "@/src/entities/models/job.model";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";

const jobOf = async (id: string) => dataOf(await getJob({ id })).job;

const button = (job: Job) =>
  render(
    <>
      <PinButton job={job} />
      <Toaster id={APP_TOASTER} />
    </>,
  );

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  toast.dismiss();
});

describe("the pin button (R27)", () => {
  it("pins a job in one tap, says so, and unpins it on Undo", async () => {
    const job = await aJob(await aCompany());
    button(job);

    fireEvent.click(screen.getByRole("button", { name: `Pin ${job.role}` }));

    await waitFor(async () =>
      expect((await jobOf(job.id)).pinnedAt).toBeInstanceOf(Date),
    );
    expect(
      await screen.findByText(`Pinned ${job.role} to the top.`),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(async () =>
      expect((await jobOf(job.id)).pinnedAt).toBeNull(),
    );
  });

  it("says why when the pin is refused", async () => {
    const job = await aJob(await aCompany());
    const applied = dataOf(
      await setJobStatus({ id: job.id, status: "applied" }),
    );
    button(applied);

    fireEvent.click(screen.getByRole("button", { name: `Pin ${job.role}` }));

    expect(await screen.findByText(/can be pinned/)).toBeTruthy();
  });
});
