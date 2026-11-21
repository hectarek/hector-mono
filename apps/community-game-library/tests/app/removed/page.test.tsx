import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import RemovedPage from "@/app/removed/page";
import { removeAccount, signInAsMember } from "@/tests/_support/members";
import type { Redirected } from "@/tests/_support/next";

describe("the page a removed account sees", () => {
  it("says the account was removed and offers Sign out, and nothing else", async () => {
    removeAccount(await signInAsMember());
    const view = render(await RemovedPage());
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your account was removed.",
    );
    expect(
      view
        .getByRole("button", { name: "Sign out" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/auth/sign-out");
    expect(view.container.querySelectorAll("a, button")).toHaveLength(1);
  });

  it("sends everyone else to the app", async () => {
    await signInAsMember();
    const err = await RemovedPage().catch((caught: unknown) => caught);
    expect((err as Redirected).url).toBe("/");
  });
});
