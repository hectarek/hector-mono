import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { within } from "@testing-library/dom";
import JobPage from "@/app/(main)/jobs/[id]/page";
import { dismissProposal, setJobStatus } from "@/app/actions/jobs";
import { addNote } from "@/app/actions/notes";
import { NotFoundPage } from "@/tests/_support/next";
import { aCompany, aJob, aProposal, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const jobPage = async (id: string) =>
  within(
    await renderOnServer(await JobPage({ params: Promise.resolve({ id }) })),
  );

afterEach(() => {
  setSystemTime();
});

describe("a job's page", () => {
  it("shows an accepted job's status with its moves, its facts, summary and notes, and its history", async () => {
    const job = await aJob(await aCompany(), {
      postingUrl: "https://boards.greenhouse.io/acme/jobs/77",
      payMin: 12_345,
      payMax: 67_890,
      summary: "A fictional posting.",
    });
    dataOf(await setJobStatus({ id: job.id, status: "target" }));
    dataOf(
      await addNote({ record: { kind: "job", id: job.id }, body: "A note." }),
    );

    const page = await jobPage(job.id);

    expect(page.getByRole("heading", { name: "Widget engineer" })).toBeTruthy();
    const status = within(page.getByRole("region", { name: "Status" }));
    expect(status.getByText("Verify → Target")).toBeTruthy();
    expect(status.getByRole("button", { name: "Move" })).toBeTruthy();
    const facts = within(page.getByRole("region", { name: "Facts" }));
    expect(
      facts
        .getByRole("link", {
          name: "https://boards.greenhouse.io/acme/jobs/77",
        })
        .getAttribute("rel"),
    ).toBe("noopener noreferrer");
    expect(facts.getByText("$12,345 – $67,890")).toBeTruthy();
    expect(facts.getByText("Referral")).toBeTruthy();
    expect(
      within(page.getByRole("region", { name: "Summary" })).getByText(
        "A fictional posting.",
      ),
    ).toBeTruthy();
    const notes = within(page.getByRole("region", { name: "Notes" }));
    expect(notes.getByText("A note.")).toBeTruthy();
    expect(notes.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(page.getByRole("region", { name: "History" })).toBeTruthy();
  });

  it("tells a job applied to 21 days ago with no move since it's a stale candidate", async () => {
    setSystemTime(new Date("2026-10-26T16:00:00Z"));
    const job = await aJob(await aCompany());
    dataOf(
      await setJobStatus({ id: job.id, status: "applied", on: "2026-10-05" }),
    );

    const page = await jobPage(job.id);
    expect(
      page.getByText(
        "No reply 21 days after applying: close it as stale, or move it on.",
      ),
    ).toBeTruthy();
  });

  it("shows Hector a proposal's reason and his review, and Claude's session the same off", async () => {
    const proposal = await aProposal(await aCompany());

    signInAs("owner");
    const hectors = await jobPage(proposal.id);
    const review = within(hectors.getByRole("region", { name: "Review" }));
    expect(review.getByText("Matches the target role")).toBeTruthy();
    expect(review.getByRole("button", { name: "Accept" })).toBeTruthy();
    expect(hectors.queryByRole("region", { name: "Status" })).toBeNull();

    signInAs("agent");
    const claudes = await jobPage(proposal.id);
    const off = within(claudes.getByRole("region", { name: "Review" }));
    expect(
      off.getByRole<HTMLButtonElement>("button", { name: "Accept" }).disabled,
    ).toBe(true);
    expect(off.getByText("Only Hector")).toBeTruthy();
    expect(
      claudes.getByRole<HTMLButtonElement>("button", { name: "Delete" })
        .disabled,
    ).toBe(true);
    expect(
      within(claudes.getByRole("region", { name: "Notes" })).queryByRole(
        "button",
        { name: "Edit" },
      ),
    ).toBeNull();
  });

  // R20: a dismissed proposal changes only once Hector reopens it.
  it("shows Claude's session a dismissed proposal's Edit off, as only Hector's, and Hector his", async () => {
    const proposal = await aProposal(await aCompany());
    signInAs("owner");
    dataOf(
      await dismissProposal({
        id: proposal.id,
        updatedAt: proposal.updatedAt.toISOString(),
        reason: "not-hiring",
      }),
    );

    const hectors = await jobPage(proposal.id);
    expect(
      hectors.getByRole("button", { name: "Edit" }).getAttribute("href"),
    ).toBe(`/jobs/${proposal.id}/edit`);

    signInAs("agent");
    const claudes = await jobPage(proposal.id);
    const edit = claudes.getByRole<HTMLButtonElement>("button", {
      name: "Edit",
    });
    expect(edit.disabled).toBe(true);
    expect(edit.getAttribute("href")).toBeNull();
  });

  it("is not found for an unknown or malformed id", async () => {
    signInAs("owner");
    for (const id of [crypto.randomUUID(), "not-an-id"]) {
      expect(
        await JobPage({ params: Promise.resolve({ id }) }).catch(
          (err: unknown) => err,
        ),
      ).toBeInstanceOf(NotFoundPage);
    }
  });
});
