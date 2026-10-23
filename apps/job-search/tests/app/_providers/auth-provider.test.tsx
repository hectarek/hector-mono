import { describe, expect, it } from "bun:test";
import { AuthView } from "@neondatabase/auth/react";
import { within } from "@testing-library/dom";
import { AuthProvider } from "@/app/_providers/auth-provider";
import { renderOnServer } from "@/tests/_support/server-render";

describe("AuthProvider", () => {
  // The app's two accounts exist before first use, and Neon's own setting closes sign-up
  // (docs/build-plan.md KTD2).
  it("offers sign-in with no way to create an account", async () => {
    const page = await renderOnServer(
      <AuthProvider>
        <AuthView path="sign-in" />
      </AuthProvider>,
    );
    const view = within(page);

    expect(view.getByRole("button", { name: "Login" })).toBeTruthy();
    const toSignUp = view
      .queryAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.includes("sign-up"));
    expect(toSignUp).toEqual([]);
    expect(page.textContent).not.toMatch(/sign up|don.t have an account/i);
  });
});
