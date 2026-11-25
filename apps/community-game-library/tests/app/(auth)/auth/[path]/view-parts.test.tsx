import { describe, expect, it } from "bun:test";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { render } from "@testing-library/react";
import { authHeading } from "@/app/(auth)/auth/[path]/view-parts";

const heading = (path: string, redirectTo = "/") =>
  render(<header>{authHeading(path, redirectTo)}</header>);

const linesOf = (view: ReturnType<typeof render>) =>
  [...view.container.querySelectorAll("p")].map((line) => line.textContent);

const A2_LINE =
  "Anyone can sign up. Add the games you own right away. You’ll see friends’ games once you have friends.";

describe("Neon's sign-in views' heading", () => {
  it("is A2's h1 and its line", () => {
    const view = heading(authViewPaths.SIGN_UP);
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Make your account",
    );
    expect(linesOf(view)).toEqual([A2_LINE]);
  });

  it("says a sign-up from a friend link makes the two friends, as A2 draws it", () => {
    const view = heading(authViewPaths.SIGN_UP, "/f/7QK2-MARR");
    expect(linesOf(view)).toEqual([
      A2_LINE,
      "You’ll be friends with the person who sent the link.",
    ]);
  });

  it("is A8's h1 alone", () => {
    const view = heading(authViewPaths.SIGN_IN, "/f/7QK2-MARR");
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Sign in");
    expect(linesOf(view)).toEqual([]);
  });

  it("leaves every other view's heading to Neon", () => {
    expect(authHeading(authViewPaths.FORGOT_PASSWORD, "/")).toBeUndefined();
    expect(authHeading(authViewPaths.EMAIL_VERIFICATION, "/")).toBeUndefined();
  });
});
