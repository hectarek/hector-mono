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
import GameRecordPage from "@/app/(main)/admin/games/[id]/page";
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

const { sam, you } = CAST.people;
const { games } = CAST;

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
  it("says when no suggestions wait, with the catalog's tasks and Accounts (G1)", async () => {
    const view = render(await AdminPage());

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Admin");
    expect(view.getByText("No suggestions waiting.")).toBeTruthy();
    for (const [row, href] of [
      ["Find a game to edit", "/admin/games"],
      ["Add a game by hand", "/admin/games/new"],
      ["Remove an account", "/admin/accounts"],
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
    // The game starts on the closest match, and its list shows each match by its cover.
    const game = await page.findByRole("combobox", { name: "The game" });
    expect(game.textContent).toBe("Salt & Signal (2022)");
    fireEvent.click(game);
    const match = await view.findByRole("option", {
      name: "Salt & Signal (2022)",
      selected: true,
    });
    expect(match.querySelector("[data-color]")).toBeTruthy();
    fireEvent.click(match);
    await waitFor(() =>
      expect(view.queryByRole("listbox") === null).toBe(true),
    );
    const form = page
      .getByRole("button", { name: "Send answer" })
      .closest("form") as HTMLFormElement;
    expect(new FormData(form).get("gameId")).toBe(CAST.games.saltAndSignal.id);
    fireEvent.submit(form);

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
    // A category the catalog uses, tapped, and one it doesn't yet, added.
    fireEvent.click(
      page.getByRole("button", { name: "Family", pressed: false }),
    );
    fireEvent.change(page.getByLabelText("New category"), {
      target: { value: "Lighthouses" },
    });
    fireEvent.click(page.getByRole("button", { name: "Add" }));
    expect(
      await page.findByRole("button", { name: "Lighthouses", pressed: true }),
    ).toBeTruthy();
    expect(
      page.getByRole("button", { name: "Family", pressed: true }),
    ).toBeTruthy();
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
      type: "base-game",
      baseGameId: null,
      minPlayers: 2,
      maxPlayers: 4,
      bestPlayers: [3],
      categories: ["Family", "Lighthouses"],
      imageUrl: "https://example.test/fog-lantern.jpg",
    });
  });

  // Hector, 2026-11-25: an expansion is added but never lands in the suggester's library, so
  // while Expansion of is set the line says only that they're told.
  it("says only that the suggester is told while it's an expansion (G3)", async () => {
    const suggestion = await samSuggests("Harbor Lights: Squall");
    const view = render(
      await AddGamePage({
        searchParams: Promise.resolve({ suggestion: suggestion.id }),
      }),
    );
    const page = within(view.container);
    const lands =
      "From Sam’s suggestion. When you add it, Sam is told and it lands in their library.";
    const told = "From Sam’s suggestion. When you add it, Sam is told.";

    expect(page.getByText(lands)).toBeTruthy();
    fireEvent.change(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "harbor lights" } },
    );
    fireEvent.click(
      await page.findByRole("button", { name: /^Harbor Lights/ }),
    );
    expect(await page.findByText(told)).toBeTruthy();
    expect(page.queryByText(lands) === null).toBe(true);

    fireEvent.click(page.getByRole("button", { name: "Not an expansion" }));
    expect(await page.findByText(lands)).toBeTruthy();
    expect(page.queryByText(told) === null).toBe(true);
  });

  // The polish pass: G3's small caps, and its numbers typed in Plex Mono.
  it("draws G3's number fields in Plex Mono, under small caps", async () => {
    const view = render(
      await AddGamePage({ searchParams: Promise.resolve({}) }),
    );
    const page = within(view.container);

    for (const label of ["Fewest", "Most", "Shortest", "Longest"]) {
      const field = page.getByLabelText(label);
      expect(field.getAttribute("data-font")).toBe("mono");
      expect(field.getAttribute("inputmode")).toBe("numeric");
      expect(
        page.getByText(label, { selector: "span" }).getAttribute("data-ink"),
      ).toBe("smudge");
    }
    for (const label of ["Year · optional", "Minimum age · optional"]) {
      expect(page.getByLabelText(label).getAttribute("data-font")).toBe("mono");
    }
    expect(page.getByLabelText("Title").getAttribute("data-font")).toBeNull();
  });

  // A field's message shows under it where the form draws no field of its own: under the
  // chips, and under the play time's pair. The form's own line stays hidden while one shows.
  // A list's limit is said in the form's words, the same under the chips and under Designers.
  it("says what's wrong with the categories and the play time under them (G3)", async () => {
    const tooLong = "Keep it to 500 characters";
    const view = render(
      await AddGamePage({ searchParams: Promise.resolve({}) }),
    );
    const page = within(view.container);
    const kinds = within(
      page.getByRole("group", { name: "Categories · optional" }),
    );

    fireEvent.change(page.getByLabelText("Title"), {
      target: { value: "Too Many Kinds" },
    });
    fireEvent.change(page.getByLabelText("Shortest"), {
      target: { value: "soon" },
    });
    fireEvent.change(page.getByLabelText("Designers · optional"), {
      target: { value: "Ines Varga, ".repeat(42) },
    });
    // More than the 500 characters a list keeps, added at once.
    const more = kinds.queryByRole("button", { name: "More" });
    if (more) {
      fireEvent.click(more);
    }
    fireEvent.change(await kinds.findByLabelText("New category"), {
      target: {
        value: Array.from(
          { length: 25 },
          (_, n) => `A made-up kind of game ${n + 1}`,
        ).join(", "),
      },
    });
    fireEvent.click(kinds.getByRole("button", { name: "Add" }));
    fireEvent.submit(
      page
        .getByRole("button", { name: "Add to the catalog" })
        .closest("form") as HTMLFormElement,
    );

    expect(await kinds.findByText(tooLong)).toBeTruthy();
    // Each field's line, and not the form's.
    expect(
      page.getAllByRole("alert").map(({ textContent }) => textContent),
    ).toEqual(["Enter a number", tooLong, tooLong]);
  });

  // Hector, 2026-11-25: the catalog's categories as chips, the record's own first, six and More.
  it("shows the catalog's categories as chips, the record's own first, six and then More (G4)", async () => {
    // Enough categories to fold: a game with five the cast's games don't use.
    await getInjection("ITransactionManagerService").startTransaction((tx) =>
      getInjection("IGamesRepository").add(
        {
          type: "base-game",
          baseGameId: null,
          title: "Dice Derby",
          year: null,
          publishers: null,
          designers: null,
          minPlayers: null,
          maxPlayers: null,
          bestPlayers: null,
          minMinutes: null,
          maxMinutes: null,
          minAge: null,
          complexity: null,
          categories: ["Dice", "Racing", "Trivia", "Word", "Card game"],
          description: null,
          imageUrl: null,
          imageCredit: null,
          imageSourceUrl: null,
          videoUrl: null,
        },
        tx,
      ),
    );
    const catalog = await getInjection("IListCategoriesController")(you.id);
    // Night Market's own, Economic and Family, come first, then the rest, the most used first.
    const listed = [
      "Economic",
      "Family",
      ...catalog.filter((one) => one !== "Economic" && one !== "Family"),
    ];
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.nightMarket.id }),
      }),
    );
    const kinds = within(
      within(view.container).getByRole("group", {
        name: "Categories · optional",
      }),
    );
    const chips = () =>
      kinds
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("aria-pressed"))
        .map((chip) => [chip.textContent, chip.getAttribute("aria-pressed")]);

    expect(chips()).toEqual(
      listed
        .slice(0, 6)
        .map((one) => [one, `${one === "Economic" || one === "Family"}`]),
    );
    expect(kinds.queryByLabelText("New category") === null).toBe(true);
    fireEvent.click(kinds.getByRole("button", { name: "More" }));

    await waitFor(() => expect(chips()).toHaveLength(listed.length));
    expect(chips().map(([one]) => one)).toEqual(listed);
    expect(kinds.queryByRole("button", { name: "More" }) === null).toBe(true);
    expect(kinds.getByLabelText("New category")).toBeTruthy();
  });

  // Hector, 2026-11-25: Is it an expansion?, from the catalog's base games.
  it("finds an expansion's base game in the catalog, and adds it as its expansion (G3)", async () => {
    const view = withToaster(
      await AddGamePage({ searchParams: Promise.resolve({}) }),
    );
    const page = within(view.container);

    fireEvent.change(page.getByLabelText("Title"), {
      target: { value: "Harbor Lights: Low Water" },
    });
    fireEvent.change(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "harbor" } },
    );
    const found = await page.findByRole("button", { name: /^Harbor Lights/ });
    // Night Tide is an expansion itself, so it's no game's base game.
    expect(page.queryByRole("button", { name: /Night Tide/ }) === null).toBe(
      true,
    );
    expect(page.getByRole("button", { name: /^Harbor Master/ })).toBeTruthy();
    fireEvent.click(found);
    // The game picked takes the field's place, and the focus.
    expect(document.activeElement).toBe(
      await page.findByRole("button", { name: "Not an expansion" }),
    );
    expect(page.queryByRole("searchbox") === null).toBe(true);
    fireEvent.submit(
      page
        .getByRole("button", { name: "Add to the catalog" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await view.findByText("Harbor Lights: Low Water is in the catalog"),
    ).toBeTruthy();
    expect(
      (
        await getInjection("IGamesRepository").listExpansions(
          games.harborLights.id,
        )
      ).map(({ title }) => title),
    ).toContain("Harbor Lights: Low Water");
  });

  it("says no base game has the name typed (G3)", async () => {
    const view = render(
      await AddGamePage({ searchParams: Promise.resolve({}) }),
    );
    const page = within(view.container);

    fireEvent.change(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "kraken tide " } },
    );
    expect(
      await page.findByText("No base game called “kraken tide”."),
    ).toBeTruthy();
  });

  // Hector, 2026-11-25: G4 keeps the whole form, with Preview beside the video link.
  it("keeps G4's whole form, with Preview beside the video link while it holds one (G4)", async () => {
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.harborLights.id }),
      }),
    );
    const page = within(view.container);
    const link = "https://video.example/harbor-lights-how-to-play";
    const video = page.getByLabelText(
      "How-to-play video · optional",
    ) as HTMLInputElement;

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Harbor Lights",
    );
    expect(video.value).toBe(link);
    const preview = page.getByRole("button", { name: "Preview" }).closest("a");
    expect(preview?.getAttribute("href")).toBe(link);
    expect(preview?.getAttribute("target")).toBe("_blank");
    for (const typed of ["harbor lights how to play", ""]) {
      fireEvent.change(video, { target: { value: typed } });
      await waitFor(() =>
        expect(page.queryByRole("button", { name: "Preview" }) === null).toBe(
          true,
        ),
      );
    }
    fireEvent.change(video, { target: { value: link } });
    expect(await page.findByRole("button", { name: "Preview" })).toBeTruthy();
    // Its own categories, tapped, and no base game: it isn't an expansion.
    for (const category of ["Nautical", "Family"]) {
      expect(
        page.getByRole("button", { name: category, pressed: true }),
      ).toBeTruthy();
    }
    expect(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
    ).toBeTruthy();
  });

  it("says why a game with expansions can’t become one (G4)", async () => {
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.harborLights.id }),
      }),
    );
    const page = within(view.container);

    fireEvent.change(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "gull" } },
    );
    fireEvent.click(
      await page.findByRole("button", { name: /^Gull & Anchor/ }),
    );
    fireEvent.submit(
      page
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await page.findByText(
        "A game with expansions of its own can’t be an expansion",
      ),
    ).toBeTruthy();
    expect(
      await getInjection("IGamesRepository").getById(games.harborLights.id),
    ).toMatchObject({ type: "base-game", baseGameId: null });
  });

  it("makes an expansion a base game from its record, and an expansion again (G4)", async () => {
    // An expansion in nobody's box.
    const fogBank = await getInjection(
      "ITransactionManagerService",
    ).startTransaction((tx) =>
      getInjection("IGamesRepository").add(
        {
          type: "expansion",
          baseGameId: games.harborLights.id,
          title: "Harbor Lights: Fog Bank",
          year: null,
          publishers: null,
          designers: null,
          minPlayers: null,
          maxPlayers: null,
          bestPlayers: null,
          minMinutes: null,
          maxMinutes: null,
          minAge: null,
          complexity: null,
          categories: null,
          description: null,
          imageUrl: null,
          imageCredit: null,
          imageSourceUrl: null,
          videoUrl: null,
        },
        tx,
      ),
    );
    const saved = () => getInjection("IGamesRepository").getById(fogBank.id);
    const view = withToaster(
      await GameRecordPage({ params: Promise.resolve({ id: fogBank.id }) }),
    );
    const page = within(view.container);
    const save = () =>
      fireEvent.submit(
        page
          .getByRole("button", { name: "Save" })
          .closest("form") as HTMLFormElement,
      );
    const expansion = within(
      page
        .getByRole("heading", { name: "Is it an expansion?" })
        .closest("section") as HTMLElement,
    );

    expect(page.getByText("An expansion of Harbor Lights")).toBeTruthy();
    expect(expansion.getByText("Harbor Lights")).toBeTruthy();
    fireEvent.click(
      expansion.getByRole("button", { name: "Not an expansion" }),
    );
    // The search takes its place, and the focus.
    const search = await expansion.findByRole("searchbox", {
      name: "Expansion of · optional",
    });
    expect(document.activeElement).toBe(search);
    save();
    await waitFor(async () =>
      expect(await saved()).toMatchObject({
        type: "base-game",
        baseGameId: null,
      }),
    );

    fireEvent.change(search, { target: { value: "harbor lights" } });
    // Fog Bank itself isn't offered, though it's a base game now.
    fireEvent.click(
      await expansion.findByRole("button", { name: /^Harbor Lights/ }),
    );
    save();
    await waitFor(async () =>
      expect(await saved()).toMatchObject({
        type: "expansion",
        baseGameId: games.harborLights.id,
      }),
    );
  });

  // Hector, 2026-11-25: a game's type changes only while no shelf depends on it.
  it("says why a game members own can’t become an expansion (G4)", async () => {
    // Paper Kites is on your shelf.
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.paperKites.id }),
      }),
    );
    const page = within(view.container);

    fireEvent.change(
      page.getByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "gull" } },
    );
    fireEvent.click(
      await page.findByRole("button", { name: /^Gull & Anchor/ }),
    );
    fireEvent.submit(
      page
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await page.findByText(
        "Members own this game, so it can’t become an expansion",
      ),
    ).toBeTruthy();
    expect(
      await getInjection("IGamesRepository").getById(games.paperKites.id),
    ).toMatchObject({ type: "base-game", baseGameId: null });
  });

  it("says why an expansion in someone’s box can’t become a base game (G4)", async () => {
    // Night Tide is in Sam's Harbor Lights' box.
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.nightTide.id }),
      }),
    );
    const page = within(view.container);

    fireEvent.click(page.getByRole("button", { name: "Not an expansion" }));
    fireEvent.submit(
      page
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await page.findByText(
        "This expansion is in someone’s box, so it can’t become a base game",
      ),
    ).toBeTruthy();
    expect(
      await getInjection("IGamesRepository").getById(games.nightTide.id),
    ).toMatchObject({ type: "expansion", baseGameId: games.harborLights.id });
  });

  it("says why an expansion in someone’s box can’t move to another base game (G4)", async () => {
    // Night Tide is in Sam's Harbor Lights' box.
    const view = render(
      await GameRecordPage({
        params: Promise.resolve({ id: games.nightTide.id }),
      }),
    );
    const page = within(view.container);

    fireEvent.click(page.getByRole("button", { name: "Not an expansion" }));
    fireEvent.change(
      await page.findByRole("searchbox", { name: "Expansion of · optional" }),
      { target: { value: "gull" } },
    );
    fireEvent.click(
      await page.findByRole("button", { name: /^Gull & Anchor/ }),
    );
    fireEvent.submit(
      page
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await page.findByText(
        "This expansion is in someone’s box, so its base game can’t change",
      ),
    ).toBeTruthy();
    expect(
      await getInjection("IGamesRepository").getById(games.nightTide.id),
    ).toMatchObject({ type: "expansion", baseGameId: games.harborLights.id });
  });

  // The search behind Expansion of is G5's, which refuses anyone else too (the use cases' test).
  it("is Not found on G3 and G4 for anyone but the admin", async () => {
    await signInAsMember();
    for (const page of [
      AddGamePage({ searchParams: Promise.resolve({}) }),
      GameRecordPage({
        params: Promise.resolve({ id: games.harborLights.id }),
      }),
    ]) {
      expect(await page.catch((caught: unknown) => caught)).toBeInstanceOf(
        NotFoundPage,
      );
    }
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
