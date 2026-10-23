import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import PrivatePage from "@/app/(auth)/private/page";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

describe("the private screen", () => {
  // Where getPageActor sends any account but the app's two (R23, AE7).
  it("shows another account which account it is and a way to sign out, and nothing about whose app this is", async () => {
    signInAs("stranger");
    const page = await renderOnServer(<PrivatePage />);
    const view = within(page);

    expect(view.getByRole("heading", { name: "Job search" })).toBeTruthy();
    expect(view.getByText("Signed in as stranger@example.com")).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Sign out" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/auth/sign-out");
    expect(page.textContent).not.toContain("Hector");
  });
});
