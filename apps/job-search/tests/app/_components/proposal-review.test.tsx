import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ProposalReview } from "@/app/_components/proposal-review";
import { getJob } from "@/app/actions/jobs";
import { aCompany, aProposal, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const reviewOf = async (id: string) => dataOf(await getJob({ id })).job;

describe("Hector's review of a proposal", () => {
  it("accepts in one tap", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    const view = render(
      <ProposalReview jobId={proposal.id} reviewState="pending" />,
    );

    fireEvent.click(view.getByRole("button", { name: "Accept" }));

    await waitFor(async () =>
      expect(await reviewOf(proposal.id)).toMatchObject({
        reviewState: "accepted",
        nextStep: "Verify it's hiring",
      }),
    );
  });

  it("dismisses with a reason and a note, and reopens", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    const view = render(
      <ProposalReview jobId={proposal.id} reviewState="pending" />,
    );

    expect(view.getByRole("button", { name: "Dismiss" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(view.getByRole("button", { name: "Pay too low" }));
    fireEvent.change(view.getByLabelText("Note"), {
      target: { value: "Below the band" },
    });
    fireEvent.click(view.getByRole("button", { name: "Dismiss" }));
    await waitFor(async () =>
      expect(await reviewOf(proposal.id)).toMatchObject({
        reviewState: "dismissed",
        dismissReason: "pay-too-low",
        dismissNote: "Below the band",
      }),
    );

    view.unmount();
    const dismissed = render(
      <ProposalReview jobId={proposal.id} reviewState="dismissed" />,
    );
    fireEvent.click(dismissed.getByRole("button", { name: "Reopen" }));
    await waitFor(async () =>
      expect((await reviewOf(proposal.id)).reviewState).toBe("pending"),
    );
  });

  it("says why when the server refuses Claude", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("agent");
    const view = render(
      <ProposalReview jobId={proposal.id} reviewState="pending" />,
    );

    fireEvent.click(view.getByRole("button", { name: "Accept" }));
    expect(await view.findByText("Only Hector can do this.")).toBeTruthy();
  });
});
