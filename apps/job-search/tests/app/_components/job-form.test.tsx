import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { JobForm } from "@/app/_components/job-form";
import { getJob, updateJob } from "@/app/actions/jobs";
import { nextState } from "@/tests/_support/next";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

const submit = (view: ReturnType<typeof render>) => {
  const form = view.container.querySelector("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

beforeEach(() => {
  nextState.pushed = [];
});

describe("the job form", () => {
  it("adds Hector's job at the company with what was filled in, and opens it", async () => {
    const companyId = await aCompany();
    signInAs("owner");
    const view = render(
      <JobForm companyId={companyId} sources={["Widget Jobs"]} />,
    );

    type(view.getByLabelText("Role"), "Anvil tester");
    type(view.getByLabelText("Source"), "widget jobs");
    fireEvent.click(view.getByRole("button", { name: "Senior" }));
    type(view.getByLabelText("Pay from"), "12345");
    submit(view);

    await waitFor(() => expect(nextState.pushed).toHaveLength(1));
    const id = nextState.pushed[0]?.replace("/jobs/", "") ?? "";
    expect(dataOf(await getJob({ id })).job).toMatchObject({
      role: "Anvil tester",
      reviewState: "accepted",
      level: "senior",
      payMin: 12_345,
      source: { name: "widget jobs" },
    });
  });

  it("shows what it can't take under the field, and stays", async () => {
    const companyId = await aCompany();
    signInAs("owner");
    const view = render(<JobForm companyId={companyId} sources={[]} />);

    type(view.getByLabelText("Role"), "Anvil tester");
    type(view.getByLabelText("Source"), "Referral");
    type(view.getByLabelText("Travel (%)"), "250");
    submit(view);

    expect(await view.findAllByText("At most 100")).not.toHaveLength(0);
    expect(nextState.pushed).toEqual([]);
  });

  // R22, KTD15.
  it("on a conflict, shows the job as it is now with the edits kept, and saves only the edits against it", async () => {
    const job = await aJob(await aCompany(), { location: "Springfield" });
    const view = render(
      <JobForm job={job} companyId={job.company.id} sources={[]} />,
    );
    // Claude changes the next step while the form is open.
    signInAs("agent");
    dataOf(
      await updateJob({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
        nextStep: "Ask for a referral",
      }),
    );

    signInAs("owner");
    type(view.getByLabelText("Location"), "Shelbyville");
    submit(view);

    const notice = await view.findByRole("alert");
    expect(
      within(notice).getByText("Next step is now Ask for a referral"),
    ).toBeTruthy();
    expect(view.getByLabelText("Location")).toHaveProperty(
      "value",
      "Shelbyville",
    );

    submit(view);
    await waitFor(() => expect(nextState.pushed).toEqual([`/jobs/${job.id}`]));
    expect(dataOf(await getJob({ id: job.id })).job).toMatchObject({
      location: "Shelbyville",
      nextStep: "Ask for a referral",
    });
  });
});
