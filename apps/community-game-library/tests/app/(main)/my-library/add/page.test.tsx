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
import AddGamesPage from "@/app/(main)/my-library/add/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { games, people } = CAST;

const renderAddGames = async (q?: string) =>
  render(
    <>
      {
        await AddGamesPage({
          searchParams: Promise.resolve(q === undefined ? {} : { q }),
        })
      }
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// A catalog row by its title.
const row = (view: ReturnType<typeof render>, title: string) => {
  const item = within(view.container)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(title));
  if (!item) {
    throw new Error(`No row for ${title}`);
  }
  return item;
};
const yourCopiesOf = async (gameId: string) =>
  (await getInjection("IUserGamesRepository").listOwn(people.you.id)).filter(
    (copy) => copy.gameId === gameId,
  );

describe("Add games", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("asks for a search before typing", async () => {
    const view = await renderAddGames();

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Add games",
    );
    expect(view.getByLabelText("Search the catalog")).toBeTruthy();
    expect(view.getByText("Search for a game you own.")).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Done" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library");
  });

  it("draws B8: harbor, the whole catalog in one list", async () => {
    const view = await renderAddGames("harbor");

    expect(
      view.getByRole("heading", { name: "In the catalog · 4" }),
    ).toBeTruthy();
    expect(
      within(view.container)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Harbor Lights2019 · Tidewater GamesI own it",
      "Harbor Lights: Night Tide2021 · expansionAdd Harbor Lights first",
      "Harbor Master1998 · Bellwether & Co.I own it",
      "Safe Harbor2011 · Small Hours PressI own it",
    ]);
    expect(
      within(row(view, "Harbor Lights: Night Tide")).queryByRole("button") ===
        null,
    ).toBe(true);
  });

  // In the browser the add refreshes the page, which then knows the game is yours: the row keeps
  // Added and its Undo rather than turning to Yours (found in Chromium, 2026-11-24).
  it("keeps Added and Undo through the add's refresh", async () => {
    const view = await renderAddGames("harbor");
    fireEvent.click(
      within(row(view, "Harbor Lights")).getByRole("button", {
        name: "I own it",
      }),
    );
    await waitFor(async () =>
      expect(await yourCopiesOf(games.harborLights.id)).toHaveLength(1),
    );
    view.rerender(
      <>
        {await AddGamesPage({ searchParams: Promise.resolve({ q: "harbor" }) })}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const lights = row(view, "Harbor Lights");
    expect(within(lights).getByText("Added")).toBeTruthy();
    expect(within(lights).queryByText("Yours")).toBeNull();

    // Its Undo still works, which leaves the shelf as the next test expects it.
    const undo = within(lights).getByRole("button", { name: "Undo" });
    await waitFor(() => expect(undo.hasAttribute("disabled")).toBe(false));
    fireEvent.click(undo);
    await waitFor(async () =>
      expect(await yourCopiesOf(games.harborLights.id)).toHaveLength(0),
    );
  });

  it("stamps a game you own already Yours, with no I own it", async () => {
    const view = await renderAddGames("salt");

    const salt = row(view, "Salt & Signal");
    expect(within(salt).getByText("Yours")).toBeTruthy();
    expect(within(salt).queryByRole("button") === null).toBe(true);
  });

  // screens.md, After each action: "I own it" on a catalog result, several in a row (R3).
  it("adds several in a row, each with Added and Undo, and counts them", async () => {
    const view = await renderAddGames("harbor");

    fireEvent.click(
      within(row(view, "Harbor Master")).getByRole("button", {
        name: "I own it",
      }),
    );
    const message = await view.findByText("Harbor Master is in My library");
    const toast = message.closest("[data-sonner-toast]") as HTMLElement;
    // Undo, then Edit copy, as B8 draws them.
    expect(
      within(toast)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Undo", "Edit copy"]);
    // U26: the Added stamp presses as it arrives, or the row's cover token lifts instead where
    // the cover shows one (app/globals.css picks which).
    const added = within(row(view, "Harbor Master")).getByText("Added");
    expect(added.dataset.moment).toBe("press");
    expect(added.parentElement?.dataset.moment).toBe("add-copy");
    expect(await view.findByText("1 added")).toBeTruthy();

    fireEvent.click(
      within(row(view, "Safe Harbor")).getByRole("button", {
        name: "I own it",
      }),
    );
    expect(await view.findByText("2 added")).toBeTruthy();
    expect(await yourCopiesOf(games.safeHarbor.id)).toHaveLength(1);

    // Undo on the row takes it off your shelf again. It's switched off until the add's
    // transition ends, which can come a moment after "2 added" shows (on CI's runner, 2026-11-22),
    // and a click on it then does nothing, as a tap wouldn't.
    const undo = within(row(view, "Safe Harbor")).getByRole("button", {
      name: "Undo",
    });
    await waitFor(() => expect(undo.hasAttribute("disabled")).toBe(false));
    fireEvent.click(undo);
    expect(await view.findByText("1 added")).toBeTruthy();
    expect(await yourCopiesOf(games.safeHarbor.id)).toHaveLength(0);

    // Edit copy opens the copy just added.
    const [harborMaster] = await yourCopiesOf(games.harborMaster.id);
    fireEvent.click(within(toast).getByRole("button", { name: "Edit copy" }));
    expect(nextState.pushed).toContain(`/copies/${harborMaster?.id}`);

    // As it was, for the next test.
    if (harborMaster) {
      await getInjection("IRemoveUserGameController")(
        { userGameId: harborMaster.id },
        people.you.id,
      );
    }
  });

  // screens.md, After each action: "In my box" on an expansion's result.
  it("puts an expansion in the box of your copy of its base game", async () => {
    const { copy } = await getInjection("IAddUserGameController")(
      { gameId: games.harborLights.id },
      people.you.id,
    );
    const view = await renderAddGames("night tide");

    const nightTide = row(view, "Harbor Lights: Night Tide");
    expect(
      within(nightTide).getByText("2021 · expansion of Harbor Lights"),
    ).toBeTruthy();
    fireEvent.click(
      within(nightTide).getByRole("button", { name: "In my box" }),
    );

    expect(
      await view.findByText("Night Tide is in the box of your Harbor Lights"),
    ).toBeTruthy();
    expect(within(nightTide).getByText("In the box")).toBeTruthy();
    expect(
      (
        await getInjection("IUserGamesRepository").listExpansionsInBoxes([
          copy.id,
        ])
      ).map((boxed) => boxed.gameId),
    ).toEqual([games.nightTide.id]);

    // As it was, for the next test.
    await getInjection("IRemoveUserGameController")(
      { userGameId: copy.id },
      people.you.id,
    );
  });
});
