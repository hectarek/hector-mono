import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { render, waitFor, within } from "@testing-library/react";

// The user agent the request came with; headers() works only inside a request.
let userAgent: string | null = null;
mock.module("next/headers", () => ({
  headers: async () =>
    new Headers(userAgent ? { "user-agent": userAgent } : undefined),
}));

const { default: NightLinkPage } = await import("@/app/n/[token]/page");
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { resetCastNights, signInAsMember, signInAsYouWithTheCast } =
  await import("@/tests/_support/members");
const { nextState, signInAsNewUser } = await import("@/tests/_support/next");

const { heavyGamesAtMine } = CAST.nights;
const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 1)";

const open = async (token: string) =>
  render(await NightLinkPage({ params: Promise.resolve({ token }) }));
// A link-styled Button has the button role (AGENTS.md, Testing).
const hrefOf = (view: ReturnType<typeof render>, name: string) =>
  view.getByRole("button", { name }).closest("a")?.getAttribute("href");

describe("a night's link, /n/<token> (U19: D14)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    resetCastNights();
    userAgent = null;
  });
  afterEach(() => {
    setSystemTime();
  });

  it("shows a signed-out visitor D14: the title, the start and the seats, never the place", async () => {
    nextState.userId = undefined;
    const view = await open("7QK2-MARR");
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "You’re invited to a game night",
    );
    for (const text of [
      "Heavy games at mine",
      "Fri, Nov 20 · 7:00 PM",
      "6 seats · full, with a waitlist",
      "The place shows once you’re signed in.",
    ]) {
      expect(page.getByText(text)).toBeTruthy();
    }
    expect(view.container.textContent).not.toContain("Juniper");
    const back = `?redirectTo=${encodeURIComponent("/n/7QK2-MARR")}`;
    expect(hrefOf(view, "Make an account")).toBe(`/auth/sign-up${back}`);
    expect(hrefOf(view, "Sign in")).toBe(`/auth/sign-in${back}`);
  });

  it("asks for the phone's browser inside a chat app's own (A9)", async () => {
    nextState.userId = undefined;
    userAgent = INSTAGRAM;
    const view = await open("7QK2-MARR");
    expect(view.getByText("Open this in your browser")).toBeTruthy();
  });

  it("says a replaced link no longer works", async () => {
    nextState.userId = undefined;
    const view = await open("K7Q2-HARB");
    expect(
      view.getByText("This link no longer works. Ask the host for a new one."),
    ).toBeTruthy();
  });

  it("puts a signed-in member on the night's list, then opens the night", async () => {
    const userId = await signInAsMember();
    nextState.pushed = [];
    await open("7QK2-MARR");
    await waitFor(() =>
      expect(nextState.pushed).toContain(`/nights/${heavyGamesAtMine.id}`),
    );
    expect(
      await getInjection("IGameNightsRepository").getAttendee(
        heavyGamesAtMine.id,
        userId,
      ),
    ).toMatchObject({ status: "invited", invitedBy: null });
  });

  it("takes someone who has only just signed up to set up their profile, on the list already", async () => {
    const userId = signInAsNewUser();
    nextState.pushed = [];
    await open("7QK2-MARR");
    await waitFor(() => expect(nextState.pushed).toContain("/start/profile"));
    expect(
      await getInjection("IGameNightsRepository").getAttendee(
        heavyGamesAtMine.id,
        userId,
      ),
    ).toMatchObject({ status: "invited" });
  });
});
