import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
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
});
