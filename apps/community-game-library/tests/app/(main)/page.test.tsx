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
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
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
    // B1's views, All friends pressed; My library is the other.
    expect(
      view
        .getByRole("button", { name: "All friends" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "My library" }));
    expect(nextState.pushed).toContain("/my-library");
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
    // I own it on each base game, none on an expansion whose base game you don't own (R3).
    expect(
      within(catalog)
        .getAllByRole("button", { name: "I own it" })
        .map((button) => button.closest("li")?.textContent),
    ).toEqual([
      "Harbor Master1998 · Bellwether & Co.I own it",
      "Safe Harbor2011 · Small Hours PressI own it",
    ]);
    expect(view.queryByRole("button", { name: "All friends" }) === null).toBe(
      true,
    );
    expect(
      view
        .getByRole("button", { name: "Can’t find it? Suggest a game" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/suggest?title=harbor");
    // The catalog's sources' credit, at the foot (Y1, U24).
    expect(
      view.getByText("Game facts from Wikidata and Wikipedia."),
    ).toBeTruthy();
  });

  it("says when nothing is called what you typed", async () => {
    const view = await renderLibrary("fog lantern");

    expect(view.getByText("Nothing called “fog lantern” yet.")).toBeTruthy();
    expect(view.queryByText(/Game facts from/) === null).toBe(true);
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

describe("All friends", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  const renderView = async (params: Record<string, string> = {}) =>
    render(await LibraryPage({ searchParams: Promise.resolve(params) }));
  // A Base UI control's name, from the label it's labelled by.
  const nameOf = (control: HTMLElement) =>
    (control.getAttribute("aria-labelledby") ?? "")
      .split(" ")
      .map((id) => control.ownerDocument.getElementById(id)?.textContent)
      .join(" ")
      .trim();
  // The games' titles, in the list's order.
  const titles = (view: ReturnType<typeof render>) =>
    within(view.container)
      .queryAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/games/"))
      .map((link) => link.querySelector(".font-bold")?.textContent);

  it("draws B1: every game by title, one card each, with Filter and Sort", async () => {
    const view = await renderView();

    expect(view.getByText("9 games · by title")).toBeTruthy();
    expect(
      within(view.container).getByRole("button", { name: "Filter" }),
    ).toBeTruthy();
    expect(
      within(view.container).getByRole("button", { name: "Sort: Title" }),
    ).toBeTruthy();
    expect(titles(view)).toEqual([
      "Fenwick Fair",
      "Gull & Anchor",
      "Harbor Lights",
      "Moss & Mortar",
      "Night Market",
      "Paper Kites",
      "Quarry Lane",
      "Salt & Signal",
      "Tin Kettle Derby",
    ]);
    // AE1, the list's half.
    const harbor = within(view.container)
      .getAllByRole("link")
      .find(
        (link) =>
          link.getAttribute("href") === `/games/${games.harborLights.id}`,
      );
    expect(harbor?.textContent).toContain("1 of 2 available");
  });

  it("draws B3: the address's filters as chips, each taken off by a tap", async () => {
    const view = await renderView({
      available: "now",
      "plays-with": "4",
      time: "1-hour",
    });
    const list = within(view.container);

    expect(titles(view)).toEqual(["Harbor Lights", "Tin Kettle Derby"]);
    expect(view.getByText("2 games")).toBeTruthy();
    for (const chip of ["4 players", "1 hour or less", "Available now"]) {
      expect(
        list.getByRole("button", { name: chip }).getAttribute("aria-pressed"),
      ).toBe("true");
    }
    expect(
      list.getByRole("button", { name: "Share these filters" }),
    ).toBeTruthy();

    fireEvent.click(list.getByRole("button", { name: "1 hour or less" }));
    expect(nextState.pushed.at(-1)).toBe("/?available=now&plays-with=4");
    fireEvent.click(list.getByRole("button", { name: "Clear filters" }));
    expect(nextState.pushed.at(-1)).toBe("/");
  });

  it("draws B4: nothing matches, with the filter whose dropping brings back the most", async () => {
    const view = await renderView({
      "plays-with": "4",
      complexity: "heavy",
      time: "30-minutes",
    });
    const list = within(view.container);

    expect(view.getByText("0 games")).toBeTruthy();
    expect(view.getByText("No games match")).toBeTruthy();
    expect(
      view.getByText(
        "No one’s library has a heavy game for four that plays in 30 minutes or less.",
      ),
    ).toBeTruthy();
    expect(
      list
        .getByRole("button", { name: "Without “Complexity: heavy”: 2 games" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/?plays-with=4&time=30-minutes");
    expect(
      list
        .getByRole("button", { name: "Clear filters" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/");
    expect(
      list.queryByRole("button", { name: "Share these filters" }) === null,
    ).toBe(true);
  });

  // B2: the sheet's choices are its own until Show applies them, and its count follows them.
  it("filters in B2's sheet, counting as the choices change", async () => {
    const view = await renderView();
    fireEvent.click(
      within(view.container).getByRole("button", { name: "Filter" }),
    );
    const sheet = within(await view.findByRole("dialog"));

    expect(sheet.getByRole("heading", { name: "Filter" })).toBeTruthy();
    expect(
      sheet.getByRole("button", { name: "Close without changing the filters" }),
    ).toBeTruthy();
    expect(sheet.getByRole("button", { name: "Show 9 games" })).toBeTruthy();
    // Every owner with a copy, you first, then your friends by name.
    expect(sheet.getAllByRole("checkbox").map(nameOf)).toEqual([
      "You",
      "Alice",
      "Jo",
      "Priya",
      "Sam",
    ]);

    fireEvent.click(sheet.getByRole("switch", { name: "Available now" }));
    fireEvent.click(sheet.getByRole("button", { name: "4 players" }));
    fireEvent.click(sheet.getByRole("button", { name: "1 hour or less" }));
    // A Base UI toggle group's change inside a dialog renders a moment later in happy-dom.
    const show = await sheet.findByRole("button", { name: "Show 2 games" });
    // Nothing applies until Show.
    expect(nextState.pushed).toEqual([]);

    fireEvent.click(show);
    expect(nextState.pushed).toEqual([
      "/?available=now&plays-with=4&time=1-hour",
    ]);
  });

  // B12: a tap on a sort applies it and closes the sheet (ABF-17).
  it("sorts from B12's sheet", async () => {
    const view = await renderView();
    fireEvent.click(
      within(view.container).getByRole("button", { name: "Sort: Title" }),
    );
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getAllByRole("radio").map(nameOf)).toEqual([
      "Title, A to Z",
      "Recently added",
      "Complexity, lightest first",
      "Play time, shortest first",
      "Year, newest first",
      "Most borrowed",
    ]);

    fireEvent.click(sheet.getByRole("radio", { name: "Year, newest first" }));
    expect(nextState.pushed.at(-1)).toBe("/?sort=year");
  });

  it("says when you have no friends yet, with your friend link", async () => {
    await signInAsMember();
    const view = await renderView();

    expect(view.getByText("0 games")).toBeTruthy();
    expect(view.getByText("No friends yet")).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Share my friend link" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/friends/link");
    expect(view.queryByRole("button", { name: "Filter" }) === null).toBe(true);
  });
});
