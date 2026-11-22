import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import MyLibraryPage from "@/app/(main)/my-library/page";
import SuggestPage from "@/app/(main)/my-library/suggest/page";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

describe("Suggest a game", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  // B9, opened from a search for fog lantern; then screens.md's Send a suggestion row.
  it("draws B9, sends the suggestion, and My library shows it waiting", async () => {
    const view = render(
      <>
        {
          await SuggestPage({
            searchParams: Promise.resolve({ title: "fog lantern" }),
          })
        }
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Suggest a game",
    );
    expect(
      page.getByText(
        "We couldn’t find “fog lantern”. Tell us what it is, and the admin will add it or tell you why not. If it’s added, it lands in your library.",
      ),
    ).toBeTruthy();
    expect(
      page.getByRole("link", { name: "Back to Search" }).getAttribute("href"),
    ).toBe("/?q=fog%20lantern");
    expect((page.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "fog lantern",
    );
    expect(
      page.getByText("A page about the game, if you have one."),
    ).toBeTruthy();

    fireEvent.change(page.getByLabelText("Year · optional"), {
      target: { value: "2024" },
    });
    fireEvent.submit(
      page
        .getByRole("button", { name: "Send suggestion" })
        .closest("form") as HTMLFormElement,
    );

    expect(await view.findByText("Suggestion sent.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/my-library"));

    const library = render(
      await MyLibraryPage({ searchParams: Promise.resolve({}) }),
    );
    expect(
      within(library.container).getByText(
        "suggested today · waiting on the admin",
      ),
    ).toBeTruthy();
  });
});
