import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render } from "@testing-library/react";

// The user agent the request carries; headers() works only inside a request.
let userAgent: string | null = null;
mock.module("next/headers", () => ({
  headers: async () =>
    new Headers(userAgent ? { "user-agent": userAgent } : undefined),
}));

const { WelcomeOrOpenInBrowser } = await import(
  "@/app/(auth)/welcome/welcome-screen"
);

const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 1)";

// A link-styled Button has the button role (AGENTS.md, Testing).
const hrefOf = (view: ReturnType<typeof render>, name: string) =>
  view.getByRole("button", { name }).closest("a")?.getAttribute("href");

const welcome = async (searchParams: Record<string, string> = {}) =>
  render(
    await WelcomeOrOpenInBrowser({
      searchParams: Promise.resolve(searchParams),
    }),
  );

describe("the welcome page", () => {
  beforeEach(() => {
    userAgent = SAFARI;
  });

  it("is A1: the app's name, what it's for, and the two ways in", async () => {
    const view = await welcome();
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "CommunityGameLibrary",
    );
    expect(
      view.getByText("Your friends’ board games, in one place."),
    ).toBeTruthy();
    expect(hrefOf(view, "Make an account")).toBe("/auth/sign-up");
    expect(hrefOf(view, "Sign in")).toBe("/auth/sign-in");
  });

  it("takes someone on to where they were headed", async () => {
    const view = await welcome({ redirectTo: "/games/abc" });
    expect(hrefOf(view, "Sign in")).toBe(
      "/auth/sign-in?redirectTo=%2Fgames%2Fabc",
    );
  });

  it("never carries an off-site address on", async () => {
    const view = await welcome({ redirectTo: "//evil.example" });
    expect(hrefOf(view, "Sign in")).toBe("/auth/sign-in");
  });

  it("is A9 in place of the ways in, inside a chat app's own browser", async () => {
    userAgent = INSTAGRAM;
    const view = await welcome();
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Open this in your browser",
    );
    expect(view.getByRole("button", { name: "Copy the link" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Sign in" }) === null).toBe(true);
    expect(
      view.queryByRole("button", { name: "Make an account" }) === null,
    ).toBe(true);
  });

  it("shows A1 when the request carries no user agent", async () => {
    userAgent = null;
    const view = await welcome();
    expect(hrefOf(view, "Sign in")).toBe("/auth/sign-in");
  });
});
