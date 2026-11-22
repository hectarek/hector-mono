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
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";

const { copies, people } = CAST;

const renderMyLibrary = async () =>
  render(
    <>
      {await MyLibraryPage()}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );

describe("My library", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws B6: your four games, with the Lending panel", async () => {
    const view = await renderMyLibrary();

    expect(
      view
        .getByRole("button", { name: "My library" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      view
        .getByRole("button", { name: "Add a game" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/add");
    expect(
      view
        .getByRole("switch", { name: "Friends can pass my games along" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      view.getByText(
        "On for 0 of 4 copies. You can also set it on each copy’s page.",
      ),
    ).toBeTruthy();
    expect(view.getByText("4 games")).toBeTruthy();

    const rows = within(view.container).getAllByRole("link", {
      name: /^(Gull|Night|Paper|Salt)/,
    });
    expect(rows.map((row) => row.textContent)).toEqual([
      "Gull & AnchorJo has it · 1 in lineOverdue",
      "Night MarketPriya asked for itRequested",
      "Paper KitesKept at homeNot lent",
      "Salt & SignalAt homeAvailable",
    ]);
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      `/copies/${copies.yourGullAndAnchor.id}`,
      `/copies/${copies.yourNightMarket.id}`,
      `/copies/${copies.yourPaperKites.id}`,
      `/copies/${copies.yourSaltAndSignal.id}`,
    ]);
  });

  // screens.md, Flip a switch; R48: every copy you own, and your default for the next.
  it("sets pass-along on every copy as the switch flips, with Saved.", async () => {
    const view = await renderMyLibrary();

    fireEvent.click(
      view.getByRole("switch", { name: "Friends can pass my games along" }),
    );

    expect(await view.findByText("Saved.")).toBeTruthy();
    await waitFor(async () =>
      expect(
        (await getInjection("IUserGamesRepository").listOwn(people.you.id)).map(
          (copy) => copy.passAlong,
        ),
      ).toEqual([true, true, true, true]),
    );
    expect(
      (await getInjection("IUserSettingsRepository").getByUserId(people.you.id))
        ?.defaultPassAlong,
    ).toBe(true);

    // As it was, for the next test.
    await getInjection("ISetPassAlongForAllController")(
      { passAlong: false },
      people.you.id,
    );
  });

  it("draws A7 while your library is empty", async () => {
    await signInAsMember();
    const view = await renderMyLibrary();

    expect(
      view
        .getByRole("button", { name: "Add your first game" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/add");
    expect(view.getByText("0 games")).toBeTruthy();
    expect(view.getByText("Your library is empty")).toBeTruthy();
    expect(
      view.getByText("Search for a game you own and tap I own it."),
    ).toBeTruthy();
    expect(view.queryByRole("switch") === null).toBe(true);
  });
});
