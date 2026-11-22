import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { render, waitFor, within } from "@testing-library/react";

// The user agent the request carries; headers() works only inside a request.
let userAgent: string | null = null;
mock.module("next/headers", () => ({
  headers: async () =>
    new Headers(userAgent ? { "user-agent": userAgent } : undefined),
}));

const { APP_TOASTER } = await import("@/app/_lib/notify");
const { default: FriendLinkPage } = await import("@/app/f/[token]/page");
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { signInAsMember, signInAsYouWithTheCast } = await import(
  "@/tests/_support/members"
);
const { nextState, signInAsNewUser } = await import("@/tests/_support/next");

const { sam } = CAST.people;
const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 1)";

const open = async (token: string) =>
  render(
    <>
      {await FriendLinkPage({ params: Promise.resolve({ token }) })}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// A link-styled Button has the button role (AGENTS.md, Testing).
const hrefOf = (view: ReturnType<typeof render>, name: string) =>
  view.getByRole("button", { name }).closest("a")?.getAttribute("href");

describe("a friend link, /f/<token> (A3)", () => {
  let token: string;
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    token = (await getInjection("IGetFriendLinkController")(sam.id)).token;
    userAgent = null;
  });
  afterEach(() => {
    setSystemTime();
  });

  it("shows a signed-out visitor A3, naming nobody, with the two ways in", async () => {
    nextState.userId = undefined;
    const view = await open(token);
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "A friend sent you their link",
    );
    expect(
      page.getByText(
        "Make an account or sign in and you’ll be friends at once. You’ll see who once you’re in.",
      ),
    ).toBeTruthy();
    expect(page.getByText("This link works until Tue, Nov 17")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Sam");
    const back = `?redirectTo=${encodeURIComponent(`/f/${token}`)}`;
    expect(hrefOf(view, "Make an account")).toBe(`/auth/sign-up${back}`);
    expect(hrefOf(view, "Sign in")).toBe(`/auth/sign-in${back}`);
  });

  it("asks for the phone's browser inside a chat app's own (A9)", async () => {
    nextState.userId = undefined;
    userAgent = INSTAGRAM;
    const view = await open(token);
    expect(view.getByText("Open this in your browser")).toBeTruthy();
  });

  it("says a link that has run out or been replaced no longer works", async () => {
    nextState.userId = undefined;
    const view = await open("K7Q2-HARB");
    expect(
      view.getByText(
        "This link no longer works. Ask your friend for a new one.",
      ),
    ).toBeTruthy();
  });

  it("makes a signed-in member friends at once, then opens the friend's page", async () => {
    const userId = await signInAsMember();
    nextState.pushed = [];
    const view = await open(token);

    await waitFor(() =>
      expect(nextState.pushed).toContain(`/friends/${sam.id}`),
    );
    expect(await view.findByText("You and Sam are friends.")).toBeTruthy();
    expect(
      await getInjection("IFriendshipsRepository").areFriends(userId, sam.id),
    ).toBe(true);
  });

  it("takes someone who has only just signed up to set up their profile, friends already", async () => {
    const userId = signInAsNewUser();
    await open(token);

    await waitFor(() =>
      expect(nextState.pushed).toContain(`/start/profile?friend=${sam.id}`),
    );
    expect(
      await getInjection("IFriendshipsRepository").areFriends(userId, sam.id),
    ).toBe(true);
  });
});
