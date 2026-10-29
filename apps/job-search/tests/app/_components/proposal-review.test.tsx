import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ProposalReview } from "@/app/_components/proposal-review";
import { getJob, updateJob } from "@/app/actions/jobs";
import { nextState } from "@/tests/_support/next";
import { aCompany, aProposal, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const reviewOf = async (id: string) => dataOf(await getJob({ id })).job;

describe("Hector's review of a proposal", () => {
  it("accepts in one tap", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    const view = render(
      <ProposalReview proposal={{ ...proposal, reviewState: "pending" }} />,
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
      <ProposalReview proposal={{ ...proposal, reviewState: "pending" }} />,
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
    const dismissed = await reviewOf(proposal.id);
    const reopen = render(
      <ProposalReview proposal={{ ...dismissed, reviewState: "dismissed" }} />,
    );
    fireEvent.click(reopen.getByRole("button", { name: "Reopen" }));
    await waitFor(async () =>
      expect((await reviewOf(proposal.id)).reviewState).toBe("pending"),
    );
  });

  // R22, revised 2026-10-29.
  it("refuses a proposal Claude changed after the page read it, says so, and refreshes the page", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("agent");
    dataOf(
      await updateJob({
        id: proposal.id,
        updatedAt: proposal.updatedAt.toISOString(),
        summary: "A fictional summary Claude added.",
      }),
    );
    signInAs("owner");
    nextState.refreshed = 0;
    const view = render(
      <ProposalReview proposal={{ ...proposal, reviewState: "pending" }} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Accept" }));

    expect(
      await view.findByText(
        "Claude changed this job after you opened it. Check it again, then decide.",
      ),
    ).toBeTruthy();
    expect(nextState.refreshed).toBe(1);
    expect((await reviewOf(proposal.id)).reviewState).toBe("pending");
  });

  it("says why when the server refuses Claude", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("agent");
    const view = render(
      <ProposalReview proposal={{ ...proposal, reviewState: "pending" }} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Accept" }));
    expect(await view.findByText("Only Hector can do this.")).toBeTruthy();
  });
});
