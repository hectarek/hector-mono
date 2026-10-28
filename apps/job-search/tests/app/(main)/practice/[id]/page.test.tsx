import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import PracticeSessionPage from "@/app/(main)/practice/[id]/page";
import { logPractice } from "@/app/actions/practice";
import { dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const sessionPage = async (id: string) =>
  within(
    await renderOnServer(
      await PracticeSessionPage({ params: Promise.resolve({ id }) }),
    ),
  );

// A session on Jan 5, 2026, and a failed review two days later.
async function aReviewedSession() {
  signInAs("owner");
  const topic = `Pair sum ${crypto.randomUUID().slice(0, 8)}`;
  const { session } = dataOf(
    await logPractice({
      topic,
      type: "Coding",
      pattern: "Two pointers",
      result: "solved",
      practicedOn: "2026-01-05",
      minutes: 25,
    }),
  );
  dataOf(
    await logPractice({
      sessionId: session.id,
      result: "failed",
      practicedOn: "2026-01-07",
      notes: "Missed the empty list.",
    }),
  );
  return { id: session.id, topic };
}

describe("a practice session's page", () => {
  it("shows the session, its next review, its reviews and its history, with Hector's deletes", async () => {
    const { id, topic } = await aReviewedSession();

    const page = await sessionPage(id);

    expect(page.getByRole("heading", { name: topic })).toBeTruthy();
    expect(page.getByText("Coding · Two pointers")).toBeTruthy();
    const facts = within(page.getByRole("region", { name: "Session" }));
    expect(facts.getByText("Jan 5, 2026")).toBeTruthy();
    expect(facts.getByText("25")).toBeTruthy();
    // The failed review is retried 2 days later on the same step.
    expect(facts.getByText("Review 1 · Jan 9, 2026")).toBeTruthy();
    const reviews = within(page.getByRole("region", { name: "Reviews" }));
    expect(reviews.getByText("Missed the empty list.")).toBeTruthy();
    expect(reviews.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
    expect(page.getByRole("button", { name: "Log review" })).toBeTruthy();
    const history = within(page.getByRole("region", { name: "History" }));
    expect(history.getByText("Created")).toBeTruthy();
  });

  // KTD3: what only Hector may do shows, off, in Claude's session.
  it("shows Claude's session its delete off, and no review's delete", async () => {
    const { id } = await aReviewedSession();
    signInAs("agent");

    const page = await sessionPage(id);

    expect(page.getByText("Only Hector")).toBeTruthy();
    const reviews = within(page.getByRole("region", { name: "Reviews" }));
    expect(reviews.queryAllByRole("button", { name: "Delete" })).toEqual([]);
    expect(page.getByRole("button", { name: "Log review" })).toBeTruthy();
  });
});
