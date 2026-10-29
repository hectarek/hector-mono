import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ProposalCard } from "@/app/_components/proposal-card";
import { getJob } from "@/app/actions/jobs";
import { jobSummary } from "@/src/entities/models/job.model";
import { aCompany, aProposal, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const reviewOf = async (id: string) => dataOf(await getJob({ id })).job;

describe("a proposal on This week", () => {
  it("accepts in one tap", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    const view = render(<ProposalCard proposal={jobSummary(proposal)} human />);

    fireEvent.click(view.getByRole("button", { name: "Accept" }));

    await waitFor(async () =>
      expect((await reviewOf(proposal.id)).reviewState).toBe("accepted"),
    );
  });

  it("dismisses with a tap, then a tap on the reason", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    const view = render(<ProposalCard proposal={jobSummary(proposal)} human />);

    fireEvent.click(view.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(view.getByRole("button", { name: "Wrong level" }));

    await waitFor(async () =>
      expect(await reviewOf(proposal.id)).toMatchObject({
        reviewState: "dismissed",
        dismissReason: "wrong-level",
      }),
    );
  });

  it("shows Claude's session Accept and Dismiss off, as only Hector's", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("agent");
    const view = render(
      <ProposalCard proposal={jobSummary(proposal)} human={false} />,
    );

    expect(view.getByRole("button", { name: "Accept" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(view.getByText("Only Hector")).toBeTruthy();
  });
});
