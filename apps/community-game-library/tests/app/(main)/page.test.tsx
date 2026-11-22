import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import LibraryPage from "@/app/(main)/page";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

const { games } = CAST;

const renderLibrary = async (q?: string) =>
  render(
    await LibraryPage({
      searchParams: Promise.resolve(q === undefined ? {} : { q }),
    }),
  );

describe("the Library page", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("shows a signed-in member the Library", async () => {
    const view = await renderLibrary();
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Library");
    expect(view.getByRole("searchbox", { name: "Search games" })).toBeTruthy();
  });

  // The proxy sends a visitor with no session cookie to the welcome screen first. This is a
  // cookie whose session Neon no longer knows.
  it("sends a visit with no session to the welcome screen", async () => {
    nextState.userId = undefined;
    const err = await LibraryPage({ searchParams: Promise.resolve({}) }).catch(
      (caught: unknown) => caught,
    );
    expect(err).toBeInstanceOf(Redirected);
    expect((err as Redirected).url).toBe("/welcome");
  });
});

describe("the Library's search", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws B10: harbor in two groups", async () => {
    const view = await renderLibrary("harbor");

    expect(
      view.getByText("Searching your friends’ games and the catalog."),
    ).toBeTruthy();
    const shelves = view.getByRole("heading", {
      name: "Owned by you or a friend · 1",
    }).parentElement;
    const card = within(shelves as HTMLElement).getByRole("link");
    expect(card.getAttribute("href")).toBe(
      `/games/${games.harborLights.id}?q=harbor`,
    );
    for (const words of [
      "Harbor Lights",
      "2–5 · 45–60 min",
      "Sam’s and Alice’s",
      "1 of 2 available",
      "Available",
    ]) {
      expect(within(card).getByText(words)).toBeTruthy();
    }

    const catalog = view.getByRole("heading", {
      name: "In the catalog · 3",
    }).parentElement as HTMLElement;
    expect(
      within(catalog)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Harbor Lights: Night Tide2021 · expansionAdd Harbor Lights first",
      "Harbor Master1998 · Bellwether & Co.",
      "Safe Harbor2011 · Small Hours Press",
    ]);
    expect(
      view
        .getByRole("button", { name: "Can’t find it? Suggest a game" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/suggest?title=harbor");
  });

  it("says when nothing is called what you typed", async () => {
    const view = await renderLibrary("fog lantern");

    expect(view.getByText("Nothing called “fog lantern” yet.")).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Suggest a game" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/suggest?title=fog%20lantern");
  });

  it("puts what's typed in the address once typing pauses, and clears it", async () => {
    const view = await renderLibrary();
    const field = view.getByRole("searchbox", { name: "Search games" });

    fireEvent.change(field, { target: { value: "harb" } });
    await waitFor(() => expect(nextState.pushed).toContain("/?q=harb"));

    fireEvent.click(view.getByRole("button", { name: "Clear the search" }));
    expect((field as HTMLInputElement).value).toBe("");
    await waitFor(() => expect(nextState.pushed.at(-1)).toBe("/"));
  });
});
