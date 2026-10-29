import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MarkStaleButton } from "@/app/_components/mark-stale-button";
import { getJob, setJobStatus } from "@/app/actions/jobs";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

describe("a stale candidate's Mark stale", () => {
  it("closes the job as stale, with no reply after 21 days as the reason (R3)", async () => {
    const job = await aJob(await aCompany());
    signInAs("owner");
    dataOf(
      await setJobStatus({ id: job.id, status: "applied", on: "2026-01-02" }),
    );
    render(<MarkStaleButton jobId={job.id} />);

    fireEvent.click(screen.getByRole("button", { name: "Mark stale" }));

    await waitFor(async () =>
      expect(dataOf(await getJob({ id: job.id }))).toMatchObject({
        job: { status: "stale", nextStep: null, nextDate: null },
        activity: expect.arrayContaining([
          expect.objectContaining({ reason: "No reply after 21 days" }),
        ]),
      }),
    );
  });
});
