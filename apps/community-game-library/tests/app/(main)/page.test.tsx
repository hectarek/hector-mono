import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import LibraryPage from "@/app/(main)/page";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

describe("the Library page", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("shows a signed-in member the Library", async () => {
    const view = render(await LibraryPage());
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Library");
  });

  // The proxy sends a visitor with no session cookie to the welcome screen first. This is a
  // cookie whose session Neon no longer knows.
  it("sends a visit with no session to the welcome screen", async () => {
    nextState.userId = undefined;
    const err = await LibraryPage().catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(Redirected);
    expect((err as Redirected).url).toBe("/welcome");
  });
});
