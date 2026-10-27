import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { JobStatusForm } from "@/app/_components/job-status-form";
import { getJob } from "@/app/actions/jobs";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const submit = (view: ReturnType<typeof render>) => {
  const form = view.container.querySelector("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

const statusOf = async (id: string) => dataOf(await getJob({ id })).job;

describe("moving a job", () => {
  it("moves it to the status picked, on the date given", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    const view = render(<JobStatusForm jobId={job.id} today="2026-10-26" />);

    fireEvent.click(view.getByRole("button", { name: "Applied" }));
    fireEvent.change(view.getByLabelText("On"), {
      target: { value: "2026-10-01" },
    });
    submit(view);

    await waitFor(async () =>
      expect(await statusOf(job.id)).toMatchObject({
        status: "applied",
        appliedOn: "2026-10-01",
        nextStep: "Follow up",
      }),
    );
  });

  it("closes it only with a reason, which it asks for once a closed status is picked", async () => {
    const job = await aJob(await aCompany());
    signInAs("owner");
    const view = render(<JobStatusForm jobId={job.id} today="2026-10-26" />);

    expect(view.queryByLabelText("Reason")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Withdrawn" }));
    expect(view.getByRole("button", { name: "Close" })).toBeTruthy();
    submit(view);
    expect(await view.findAllByText("Say why it's closing")).not.toHaveLength(
      0,
    );

    fireEvent.change(view.getByLabelText("Reason"), {
      target: { value: "Took another path" },
    });
    submit(view);
    await waitFor(async () =>
      expect((await statusOf(job.id)).status).toBe("withdrawn"),
    );
  });
});
