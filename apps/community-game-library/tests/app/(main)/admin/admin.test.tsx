import "@/tests/_support/as-admin";
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
import AddGamePage from "@/app/(main)/admin/games/new/page";
import AdminPage from "@/app/(main)/admin/page";
import SuggestionPage from "@/app/(main)/admin/suggestions/[id]/page";
import YouPage from "@/app/(main)/you/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { sam } = CAST.people;

const withToaster = (page: React.ReactNode) =>
  render(
    <>
      {page}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// Sam suggests a game, as B9 sends it.
const samSuggests = (title: string) =>
  getInjection("ISuggestGameController")(
    {
      title,
      year: "2024",
      publisher: "Small Hours Press",
      sourceUrl: "",
      photo: null,
    },
    sam.id,
  );

describe("the admin's pages", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  // screens.md, Empty lists: The admin's suggestions.
  it("says when no suggestions wait (G1)", async () => {
    const view = render(await AdminPage());

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Admin");
    expect(view.getByText("No suggestions waiting.")).toBeTruthy();
    for (const [row, href] of [
      ["Find a game to edit", "/admin/games"],
      ["Add a game by hand", "/admin/games/new"],
    ] as const) {
      expect(
        within(view.container)
          .getByRole("link", { name: row })
          .getAttribute("href"),
      ).toBe(href);
    }
  });

  it("is Not found for anyone but the admin", async () => {
    await signInAsMember();
    expect(await AdminPage().catch((caught: unknown) => caught)).toBeInstanceOf(
      NotFoundPage,
    );
  });

  // G2's three answers, and G1's row for a waiting suggestion.
  it("answers a suggestion that it's already here (G1, G2)", async () => {
    const suggestion = await samSuggests("Salt and Signal");
    const admin = render(await AdminPage());
    const row = within(admin.container).getByRole("link", {
      name: /Salt and Signal/,
    });
    expect(row.getAttribute("href")).toBe(
      `/admin/suggestions/${suggestion.id}`,
    );
    expect(row.textContent).toContain("Sam · today");
    expect(row.textContent).toContain("New");

    const view = withToaster(
      await SuggestionPage({
        params: Promise.resolve({ id: suggestion.id }),
        searchParams: Promise.resolve({ q: "salt" }),
      }),
    );
    const page = within(view.container);
    expect(page.getByText("What Sam sent")).toBeTruthy();
    expect(page.getByText("Sam suggested it")).toBeTruthy();
    // Add it, chosen first, opens G3 with what was sent.
    expect(
      page
        .getByRole("button", { name: "Add it by hand" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/admin/games/new?suggestion=${suggestion.id}`);

    fireEvent.click(page.getByRole("radio", { name: /It’s already here/ }));
    await waitFor(() =>
      expect(page.getByRole("combobox", { name: "The game" })).toBeTruthy(),
    );
    fireEvent.submit(
      page
        .getByRole("button", { name: "Send answer" })
        .closest("form") as HTMLFormElement,
    );

    expect(await view.findByText("Answer sent.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/admin"));
    const own = await getInjection("IUserGamesRepository").listOwn(sam.id);
    expect(
      own.some((copy) => copy.gameId === CAST.games.saltAndSignal.id),
    ).toBe(true);
  });

  it("needs a reason to decline (G2)", async () => {
    const suggestion = await samSuggests("Signal Flags");
    const view = withToaster(
      await SuggestionPage({
        params: Promise.resolve({ id: suggestion.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    const page = within(view.container);

    fireEvent.click(page.getByRole("radio", { name: /Decline/ }));
    const send = await page.findByRole("button", { name: "Send answer" });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(page.getByRole("textbox", { name: "Reason" }), {
      target: { value: "A print-and-play, not a published game." },
    });
    await waitFor(() =>
      expect((send as HTMLButtonElement).disabled).toBe(false),
    );
  });

  // G3's form, from a suggestion: it starts with what was sent, and adding it answers it.
  it("adds a suggested game by hand (G3)", async () => {
    const suggestion = await samSuggests("Fog Lantern");
    const view = withToaster(
      await AddGamePage({
        searchParams: Promise.resolve({ suggestion: suggestion.id }),
      }),
    );
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Add a game by hand",
    );
    expect(
      page.getByText(
        "From Sam’s suggestion. When you add it, Sam is told and it lands in their library.",
      ),
    ).toBeTruthy();
    expect((page.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "Fog Lantern",
    );
    expect(
      (page.getByLabelText("Publishers · optional") as HTMLInputElement).value,
    ).toBe("Small Hours Press");

    fireEvent.change(page.getByLabelText("Fewest"), { target: { value: "2" } });
    fireEvent.change(page.getByLabelText("Most"), { target: { value: "4" } });
    fireEvent.click(await page.findByRole("button", { name: "3 players" }));
    fireEvent.change(page.getByLabelText("Image address · optional"), {
      target: { value: "https://example.test/fog-lantern.jpg" },
    });
    fireEvent.submit(
      page
        .getByRole("button", { name: "Add to the catalog" })
        .closest("form") as HTMLFormElement,
    );

    expect(await view.findByText("Fog Lantern is in the catalog")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/admin"));
    const own = await getInjection("IUserGamesRepository").listOwn(sam.id);
    const games = await getInjection("IGamesRepository").listByIds(
      own.map((copy) => copy.gameId),
    );
    const fog = games.find((game) => game.title === "Fog Lantern");
    expect(fog).toMatchObject({
      minPlayers: 2,
      maxPlayers: 4,
      bestPlayers: [3],
      imageUrl: "https://example.test/fog-lantern.jpg",
    });
  });

  // E5's Admin row, with the suggestions waiting.
  it("gives the admin E5's Admin row", async () => {
    await samSuggests("Copperline");
    const view = render(await YouPage());
    const row = within(view.container).getByRole("link", { name: /^Admin/ });
    expect(row.getAttribute("href")).toBe("/admin");
    expect(row.textContent).toContain("Admin");
  });
});
