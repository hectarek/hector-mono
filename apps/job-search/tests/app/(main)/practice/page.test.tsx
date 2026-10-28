import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import PracticePage from "@/app/(main)/practice/page";
import { logPractice } from "@/app/actions/practice";
import { dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const practicePage = async () =>
  within(await renderOnServer(await PracticePage()));

describe("the practice page", () => {
  it("lists a review that's due, with its step, its day and a way to log it, and its session among the latest (R11)", async () => {
    signInAs("owner");
    const topic = `Pair sum ${crypto.randomUUID().slice(0, 8)}`;
    const { session } = dataOf(
      await logPractice({ topic, result: "solved", practicedOn: "2026-01-05" }),
    );

    const page = await practicePage();

    const due = within(page.getByRole("region", { name: "Reviews due" }));
    expect(due.getByRole("link", { name: topic }).getAttribute("href")).toBe(
      `/practice/${session.id}`,
    );
    expect(due.getByText("Review 1 of 3 · due Jan 7, 2026")).toBeTruthy();
    expect(due.getByText("Overdue")).toBeTruthy();
    expect(due.getByRole("button", { name: "Log review" })).toBeTruthy();
    const recent = within(
      page.getByRole("region", { name: "Recent sessions" }),
    );
    expect(recent.getAllByText(topic).length).toBeGreaterThan(0);
  });
});
