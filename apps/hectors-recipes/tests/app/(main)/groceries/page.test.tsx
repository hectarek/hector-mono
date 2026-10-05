import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { act, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroceriesPage from "@/app/(main)/groceries/page";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// The Groceries page as the server renders it, for someone in their own plan and a partner's.
describe("Groceries", () => {
  let userId: string;
  let ownPlan: string;
  let sharedPlan: string;

  // The page is hidden, so the live updates don't try to connect. The retry test shows it
  // and sends "online", which the live updates don't listen for (they wait for
  // visibilitychange), so they stay off.
  let visibility: DocumentVisibilityState;
  let online: boolean;

  beforeAll(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => online,
    });
    // Reduced motion, so a checked item moves without its fold (happy-dom has no animations).
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  });

  beforeEach(async () => {
    visibility = "hidden";
    online = true;
    localStorage.clear();
    userId = signInAsNewUser();
    ownPlan = (
      await getInjection("IEnsurePersonalSpaceController")("meal-plan", userId)
    ).id;
    // Joining replaces an untouched plan of your own (D15); one with an invite link stays.
    await getInjection("IEnsureInviteLinksController")(
      { spaceId: ownPlan },
      userId,
    );
    const partner = crypto.randomUUID();
    sharedPlan = (
      await getInjection("IEnsurePersonalSpaceController")("meal-plan", partner)
    ).id;
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId: sharedPlan },
      partner,
    );
    await getInjection("IAcceptInviteController")(
      { token: links.editor.token },
      userId,
    );
  });

  const page = async (plan: string) =>
    GroceriesPage({ searchParams: Promise.resolve({ plan }) });
  const items = async () =>
    getInjection("IGetGroceryListController")({ spaceId: ownPlan }, userId);

  // P14 review: the list is keyed by plan, so text typed for one plan isn't added to the
  // next one picked (Next keeps a page's state across ?plan=).
  it("leaves text typed in the add box with the plan it was typed for", async () => {
    const user = userEvent.setup();
    const view = render(await page(ownPlan));
    await user.type(view.getByRole("textbox", { name: "Add an item" }), "Milk");

    view.rerender(await page(sharedPlan));
    expect(
      (view.getByRole("textbox", { name: "Add an item" }) as HTMLInputElement)
        .value,
    ).toBe("");
  });

  it("checks an item off into Got it, and Clear checked empties it", async () => {
    const user = userEvent.setup();
    await getInjection("IAddGroceryItemController")(
      { spaceId: ownPlan, text: "Milk" },
      userId,
    );
    const view = render(await page(ownPlan));

    await user.click(view.getByRole("checkbox", { name: /Milk/ }));
    await waitFor(async () => expect((await items())[0]?.checked).toBe(true));
    // Plan's refresh after the change.
    view.rerender(await page(ownPlan));
    await view.findByText("Got it (1)");
    view.getByText("Everything's in the cart.");

    await user.click(view.getByRole("button", { name: "Clear checked" }));
    await waitFor(async () => expect(await items()).toEqual([]));
    view.rerender(await page(ownPlan));
    view.getByText(
      "The list is empty. Add items above, or add a recipe or your planned meals.",
    );
    expect(view.queryByText(/Got it/)).toBe(null);
  });

  // D52: starting the list over, from the ⋯ sheet.
  it("clears the whole list from the ⋯ sheet, after asking", async () => {
    const user = userEvent.setup();
    for (const text of ["Milk", "Eggs"]) {
      await getInjection("IAddGroceryItemController")(
        { spaceId: ownPlan, text },
        userId,
      );
    }
    const view = render(await page(ownPlan));
    const question = () =>
      view.getByRole("group", { name: "Clear the whole list?" });

    await user.click(view.getByRole("button", { name: /^More for / }));
    await user.click(await view.findByRole("button", { name: "Clear list" }));
    within(question()).getByText(/all 2 items, checked or not/);
    await user.click(
      within(question()).getByRole("button", { name: "Cancel" }),
    );
    expect(await items()).toHaveLength(2);

    await user.click(view.getByRole("button", { name: "Clear list" }));
    await user.click(
      within(question()).getByRole("button", { name: "Clear list" }),
    );
    await waitFor(async () => expect(await items()).toEqual([]));
    view.rerender(await page(ownPlan));
    await view.findByText("List cleared.");
  });

  // D8: in a store with no signal, a check-off is kept in the browser, survives a reload,
  // and is sent when the signal comes back.
  it("keeps a check-off made with no signal, and sends it when the signal is back", async () => {
    const user = userEvent.setup();
    await getInjection("IAddGroceryItemController")(
      { spaceId: ownPlan, text: "Milk" },
      userId,
    );
    online = false;
    const view = render(await page(ownPlan));

    await user.click(view.getByRole("checkbox", { name: /Milk/ }));
    await view.findByText("Not saved yet");
    await view.findByText("Got it (1)");
    expect((await items())[0]?.checked).toBe(false);

    // A reload while still offline.
    view.unmount();
    const again = render(await page(ownPlan));
    await again.findByText("Not saved yet");
    again.getByText("Got it (1)");

    online = true;
    visibility = "visible";
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(async () => expect((await items())[0]?.checked).toBe(true));
    again.rerender(await page(ownPlan));
    await waitFor(() => expect(again.queryByText("Not saved yet")).toBe(null));
    again.getByText("Got it (1)");
  });

  // D60: by recipe, each recipe's share of an item under its name; items added by hand last.
  it("shows the list by recipe, and checking a shared item there checks the one item", async () => {
    const user = userEvent.setup();
    const book = (
      await getInjection("IEnsurePersonalSpaceController")(
        "recipe-book",
        userId,
      )
    ).id;
    const recipe = async (title: string, lines: string[]) =>
      (
        await getInjection("ICreateRecipeController")(
          {
            spaceId: book,
            data: { title, ingredients: lines.map((raw) => ({ raw })) },
          },
          userId,
        )
      ).id;
    const chili = await recipe("Chili", ["2 cloves garlic", "1 lb turkey"]);
    const tacos = await recipe("Tacos", ["4 cloves garlic"]);
    await getInjection("IAddRecipesToListController")(
      { planId: ownPlan, recipes: [{ recipeId: chili }, { recipeId: tacos }] },
      userId,
    );
    await getInjection("IAddGroceryItemController")(
      { spaceId: ownPlan, text: "Milk" },
      userId,
    );
    const view = render(await page(ownPlan));
    const groups = () =>
      view.getAllByRole("region").map((section) => [
        section.getAttribute("aria-label"),
        within(section)
          .getAllByRole("checkbox")
          .map((box) => box.closest("label")?.textContent),
      ]);

    await user.selectOptions(
      view.getByRole("combobox", { name: "Group by" }),
      "By recipe",
    );
    expect(groups()).toEqual([
      ["Chili", ["2 cloves garlicfor Chili, Tacos", "1 lb turkeyfor Chili"]],
      ["Tacos", ["4 cloves garlicfor Chili, Tacos"]],
      ["Added by hand", ["Milk"]],
    ]);
    expect(window.location.search).toBe("?group=recipe");

    const tacosGroup = view.getByRole("region", { name: "Tacos" });
    await user.click(within(tacosGroup).getByRole("checkbox"));
    await waitFor(async () =>
      expect((await items()).map((item) => [item.text, item.checked])).toEqual([
        ["6 cloves garlic", true],
        ["1 lb turkey", false],
        ["Milk", false],
      ]),
    );

    await user.selectOptions(
      view.getByRole("combobox", { name: "Group by" }),
      "By aisle",
    );
    expect(window.location.search).toBe("");
  });
});
