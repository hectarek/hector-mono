import { beforeEach, describe, expect, it } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import HomeScreenPage from "@/app/(start)/start/home-screen/page";
import ProfileStepPage from "@/app/(start)/start/profile/page";
import { signInAsMember } from "@/tests/_support/members";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

const hrefOf = (view: ReturnType<typeof render>, name: string) =>
  view.getByRole("button", { name }).closest("a")?.getAttribute("href");

const wentTo = async (check: Promise<unknown>) => {
  const err = await check.catch((caught: unknown) => caught);
  expect(err).toBeInstanceOf(Redirected);
  return (err as Redirected).url;
};

describe("A4, the profile step", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("is step 1 of 3, with the name Neon Auth has, and the piece to pick", async () => {
    const view = render(
      await ProfileStepPage({ searchParams: Promise.resolve({}) }),
    );
    expect(view.getByText("Step 1 of 3")).toBeTruthy();
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Set up your profile",
    );
    expect((view.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Test User",
    );
    expect(view.getAllByRole("radio")).toHaveLength(14);
    expect(view.getByRole("button", { name: "Next" })).toBeTruthy();
    // A new account has no friends yet, so no pieces are taken.
    expect(view.queryByText("Taken by your friends") === null).toBe(true);
  });

  it("sends a member who has a profile on to the app", async () => {
    await signInAsMember();
    expect(
      await wentTo(ProfileStepPage({ searchParams: Promise.resolve({}) })),
    ).toBe("/");
  });

  it("sends a signed-out visit to the welcome page", async () => {
    nextState.userId = undefined;
    expect(
      await wentTo(ProfileStepPage({ searchParams: Promise.resolve({}) })),
    ).toBe("/welcome");
  });
});

describe("A6, the home-screen step", () => {
  const page = async (searchParams: Record<string, string> = {}) =>
    render(
      await HomeScreenPage({ searchParams: Promise.resolve(searchParams) }),
    );

  beforeEach(async () => {
    await signInAsMember();
  });

  it("is step 3 of 3, with iPhone's steps first and Go to my library", async () => {
    const view = await page();
    expect(view.getByText("Step 3 of 3")).toBeTruthy();
    expect(view.getByText("Choose Add to Home Screen")).toBeTruthy();
    expect(hrefOf(view, "Go to my library")).toBe("/");
  });

  it("switches to Android's steps", async () => {
    const view = await page();
    fireEvent.click(view.getByRole("button", { name: "Android" }));
    expect(
      view.getByText("Choose Install app or Add to Home screen"),
    ).toBeTruthy();
    expect(view.queryByText("Choose Add to Home Screen") === null).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "iPhone" }));
    expect(view.getByText("Choose Add to Home Screen")).toBeTruthy();
  });

  it("offers Chrome's own install prompt on Android when it fires one (U23)", async () => {
    const view = await page();
    let prompted = 0;
    const offer = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt: async () => {
          prompted += 1;
        },
      },
    );
    act(() => {
      window.dispatchEvent(offer);
    });
    expect(offer.defaultPrevented).toBe(true);
    expect(
      view
        .getByRole("button", { name: "Android" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(view.queryByText("Tap the menu (⋮) in Chrome") === null).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Install the app" }));
    await waitFor(() => expect(prompted).toBe(1));
    await waitFor(() =>
      expect(view.getByText("Tap the menu (⋮) in Chrome")).toBeTruthy(),
    );
  });

  it("opened from You, goes back to You and shows no step count", async () => {
    const view = await page({ from: "you" });
    expect(view.queryByText("Step 3 of 3") === null).toBe(true);
    expect(
      view.getByRole("link", { name: "Back to You" }).getAttribute("href"),
    ).toBe("/you");
    expect(hrefOf(view, "Done")).toBe("/you");
  });

  it("sends a member with no profile to set one up first", async () => {
    signInAsNewUser();
    expect(await wentTo(page())).toBe("/start/profile");
  });
});
