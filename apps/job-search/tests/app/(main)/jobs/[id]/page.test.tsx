import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { within } from "@testing-library/dom";
import { formatDay } from "@/app/_lib/format-day";
import JobPage from "@/app/(main)/jobs/[id]/page";
import { pinJob, setJobStatus } from "@/app/actions/jobs";
import { addNote } from "@/app/actions/notes";
import { NotFoundPage } from "@/tests/_support/next";
import { aClaudeJob, aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const jobPage = async (id: string) =>
  within(
    await renderOnServer(
      await JobPage({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

afterEach(() => {
  setSystemTime();
});

describe("a job's page", () => {
  it("shows a job's status with its moves, its facts, summary and notes, and its history", async () => {
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
    // The stage control (the UX plan's UX9): the job's stage marked, and Close behind its button.
    expect(
      status
        .getByRole("button", { name: "Target" })
        .getAttribute("aria-current"),
    ).toBe("step");
    expect(status.getByRole("button", { name: "Archive…" })).toBeTruthy();
    // The record header (the UX plan's UX8): who added it, and its key facts on one line.
    expect(page.getByText(/added /)).toBeTruthy();
    // Next comes right after the header, with Done, Push and Change.
    const next = within(page.getByRole("region", { name: "Next" }));
    expect(next.getByText("Apply")).toBeTruthy();
    for (const action of ["Done", "Push", "Change"]) {
      expect(next.getByRole("button", { name: action })).toBeTruthy();
    }
    const facts = within(page.getByRole("region", { name: "Facts" }));
    const posting = facts.getByRole("link", { name: "Open posting" });
    expect(posting.getAttribute("href")).toBe(
      "https://boards.greenhouse.io/acme/jobs/77",
    );
    expect(posting.getAttribute("rel")).toBe("noopener noreferrer");
    expect(facts.getByText("(boards.greenhouse.io)")).toBeTruthy();
    expect(facts.getByText("$12,345 – $67,890")).toBeTruthy();
    expect(facts.getByText("Referral")).toBeTruthy();
    // Empty facts fold into one line.
    expect(facts.getByText(/^Not set: .*Level/)).toBeTruthy();
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

  // The UX plan's UX8: a back link returns where the page was opened from.
  it("links back to the page it was opened from, and to Jobs when that would leave the app", async () => {
    const job = await aJob(await aCompany());
    const opened = async (from: string) =>
      within(
        await renderOnServer(
          await JobPage({
            params: Promise.resolve({ id: job.id }),
            searchParams: Promise.resolve({ from }),
          }),
        ),
      );

    const fromPeople = await opened("/people?view=no-date");
    expect(
      fromPeople.getByRole("link", { name: "People" }).getAttribute("href"),
    ).toBe("/people?view=no-date");
    const fromAway = await opened("//evil.example/jobs");
    expect(
      fromAway.getByRole("link", { name: "Jobs" }).getAttribute("href"),
    ).toBe("/jobs");
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

  // R27: a job not yet applied to is on the ranked list, with Pin and Not for me.
  it("shows a job Claude added with its reason, fit score and posting date, and Pin and Not for me for both sessions", async () => {
    const job = await aClaudeJob(await aCompany(), {
      score: 8,
      postedOn: "2026-10-20",
    });

    signInAs("owner");
    const hectors = await jobPage(job.id);
    const facts = within(hectors.getByRole("region", { name: "Facts" }));
    expect(facts.getByText("Matches the target role")).toBeTruthy();
    expect(facts.getByText("8/10")).toBeTruthy();
    expect(facts.getByText(formatDay("2026-10-20"))).toBeTruthy();
    expect(
      hectors.getByRole("button", { name: `Pin ${job.role}` }),
    ).toBeTruthy();
    expect(
      hectors.getByRole("button", { name: `Not for me: ${job.role}` }),
    ).toBeTruthy();
    expect(hectors.getByRole("region", { name: "Status" })).toBeTruthy();

    signInAs("agent");
    const claudes = await jobPage(job.id);
    expect(
      claudes.getByRole("button", { name: `Pin ${job.role}` }),
    ).toBeTruthy();
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

  it("marks a pinned job, offers Unpin, and drops both once it's applied to", async () => {
    const job = await aJob(await aCompany());
    dataOf(await pinJob({ id: job.id, pinned: true }));

    // The header's mark, apart from the history, which logs the pin too.
    const marked = (page: Awaited<ReturnType<typeof jobPage>>) =>
      page
        .queryAllByText("Pinned")
        .filter((element) => element.closest("header") !== null);

    const pinned = await jobPage(job.id);
    expect(marked(pinned)).toHaveLength(1);
    expect(
      pinned.getByRole("button", { name: `Unpin ${job.role}` }),
    ).toBeTruthy();

    dataOf(await setJobStatus({ id: job.id, status: "applied" }));
    const applied = await jobPage(job.id);
    expect(marked(applied)).toEqual([]);
    expect(
      applied.queryByRole("button", { name: `Unpin ${job.role}` }),
    ).toBeNull();
    expect(
      applied.queryByRole("button", { name: `Not for me: ${job.role}` }),
    ).toBeNull();
  });

  it("is not found for an unknown or malformed id", async () => {
    signInAs("owner");
    for (const id of [crypto.randomUUID(), "not-an-id"]) {
      expect(
        await JobPage({
          params: Promise.resolve({ id }),
          searchParams: Promise.resolve({}),
        }).catch((err: unknown) => err),
      ).toBeInstanceOf(NotFoundPage);
    }
  });
});
