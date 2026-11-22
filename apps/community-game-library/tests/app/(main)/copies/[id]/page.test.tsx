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
import CopyPage from "@/app/(main)/copies/[id]/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { games, copies } = CAST;

// The page as the server renders it, with the app's toaster for its messages.
const renderCopy = async (id: string) =>
  render(
    <>
      {await CopyPage({ params: Promise.resolve({ id }) })}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// A panel by its label.
const panel = (view: ReturnType<typeof render>, label: string) =>
  within(view.container).getByRole("heading", { name: label }).parentElement
    ?.parentElement as HTMLElement;
const copyOf = (id: string) => getInjection("IUserGamesRepository").getById(id);

describe("a copy's page", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws B7: your Gull & Anchor, which Jo has, overdue", async () => {
    const view = await renderCopy(copies.yourGullAndAnchor.id);

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your copy of Gull & Anchor",
    );
    expect(view.getByRole("link", { name: "Back to My library" })).toBeTruthy();
    const game = view.getByRole("link", { name: /Game details/ });
    expect(game.getAttribute("href")).toBe(`/games/${games.gullAndAnchor.id}`);

    const where = panel(view, "Where it is");
    expect(within(where).getByText("Jo has it · due Mon, Nov 9")).toBeTruthy();
    expect(within(where).getByText("Overdue")).toBeTruthy();
    expect(within(where).getByText("Ben is 1st in line")).toBeTruthy();

    const thisCopy = panel(view, "This copy");
    expect(
      (within(thisCopy).getByLabelText("Condition") as HTMLSelectElement).value,
    ).toBe("good");
    expect(
      (
        within(thisCopy).getByLabelText(
          "Missing or damaged parts · optional",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("One blue anchor token is missing.");
    expect(
      within(thisCopy)
        .getByRole("checkbox", { name: "Gull & Anchor: Low Tide" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(within(thisCopy).getByRole("button", { name: "Save" })).toBeTruthy();

    const lending = panel(view, "Lending");
    const lends = within(lending).getByRole("switch", {
      name: "I lend this copy",
    });
    const passes = within(lending).getByRole("switch", {
      name: "Friends can pass it along",
    });
    expect(lends.getAttribute("aria-checked")).toBe("true");
    expect(passes.getAttribute("aria-checked")).toBe("false");
    expect(
      within(lending).getByText(
        "On: a borrower hands it to the next friend in line. Off: it comes back to you between loans.",
      ),
    ).toBeTruthy();

    const history = view.getByRole("heading", { name: "Loan history" })
      .parentElement as HTMLElement;
    expect(
      within(history)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "JoNov 2 to nowOverdue",
      "PriyaSep 12 to Sep 26",
      "SamAug 1 to Aug 15",
    ]);
    expect(view.getByText("Added Jul 12, 2026")).toBeTruthy();
    expect(
      view.getByRole("button", { name: "I have a second copy of this" }),
    ).toBeTruthy();

    // AE2: while Jo has it, Remove is switched off, and says why.
    const remove = panel(view, "Remove");
    expect(
      (
        within(remove).getByRole("button", {
          name: "Remove from my library",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      within(remove).getByText("You can remove it once it’s back."),
    ).toBeTruthy();
  });

  it("saves This copy with Save: Saved.", async () => {
    const view = await renderCopy(copies.yourGullAndAnchor.id);
    const thisCopy = panel(view, "This copy");

    fireEvent.change(within(thisCopy).getByLabelText("Condition"), {
      target: { value: "worn" },
    });
    fireEvent.click(
      within(thisCopy).getByRole("checkbox", {
        name: "Gull & Anchor: Low Tide",
      }),
    );
    const form = within(thisCopy)
      .getByRole("button", { name: "Save" })
      .closest("form");
    if (!form) {
      throw new Error("This copy has no form");
    }
    fireEvent.submit(form);

    expect(await view.findByText("Saved.")).toBeTruthy();
    // The fields keep what was saved: no form reset puts back what the page loaded with.
    expect(
      (within(thisCopy).getByLabelText("Condition") as HTMLSelectElement).value,
    ).toBe("worn");
    expect(await copyOf(copies.yourGullAndAnchor.id)).toMatchObject({
      condition: "worn",
      conditionNote: "One blue anchor token is missing.",
    });
    expect(
      await getInjection("IUserGamesRepository").listExpansionsInBoxes([
        copies.yourGullAndAnchor.id,
      ]),
    ).toEqual([]);

    // As it was, for the next test.
    await getInjection("IUpdateUserGameController")(
      {
        userGameId: copies.yourGullAndAnchor.id,
        condition: "good",
        conditionNote: "One blue anchor token is missing.",
        expansionIds: [games.lowTide.id],
      },
      CAST.people.you.id,
    );
  });

  // screens.md, Flip a switch: it takes effect at once, with "Saved."
  it("saves a lending switch as it flips", async () => {
    const view = await renderCopy(copies.yourGullAndAnchor.id);
    const passes = within(panel(view, "Lending")).getByRole("switch", {
      name: "Friends can pass it along",
    });

    fireEvent.click(passes);

    await waitFor(async () =>
      expect((await copyOf(copies.yourGullAndAnchor.id))?.passAlong).toBe(true),
    );
    expect((await view.findAllByText("Saved.")).length).toBeGreaterThan(0);
    expect(passes.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(passes);
    await waitFor(async () =>
      expect((await copyOf(copies.yourGullAndAnchor.id))?.passAlong).toBe(
        false,
      ),
    );
  });

  it("is Not found for someone else's copy, or an id that isn't one", async () => {
    for (const id of [copies.samsHarborLights.id, "gull"]) {
      const err = await CopyPage({ params: Promise.resolve({ id }) }).catch(
        (caught: unknown) => caught,
      );
      expect(err).toBeInstanceOf(NotFoundPage);
    }
  });

  // B14, last, since it removes your Salt & Signal.
  it("asks first with B14's words, then removes the copy and opens My library", async () => {
    const view = await renderCopy(copies.yourSaltAndSignal.id);
    const remove = within(panel(view, "Remove")).getByRole("button", {
      name: "Remove from my library",
    });
    expect((remove as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(remove);
    const dialog = await view.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading").textContent?.toLowerCase()).toBe(
      "remove salt & signal from your library?",
    );
    expect(
      within(dialog).getByText(
        "Your friends stop seeing it. Its loan history goes with it. This can’t be undone.",
      ),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: "Keep it" }),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove it" }));

    expect(
      await view.findByText("Salt & Signal is removed from My library"),
    ).toBeTruthy();
    expect(nextState.pushed).toContain("/my-library");
    expect(await copyOf(copies.yourSaltAndSignal.id)).toBeUndefined();
  });
});
