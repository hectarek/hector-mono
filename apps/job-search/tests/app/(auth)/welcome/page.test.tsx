import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import WelcomePage from "@/app/(auth)/welcome/page";
import { renderOnServer } from "@/tests/_support/server-render";

describe("the welcome screen", () => {
  // Where signed-out visitors start (R23).
  it("names the app generically and offers only Sign in", async () => {
    const page = await renderOnServer(
      <WelcomePage searchParams={Promise.resolve({})} />,
    );
    const view = within(page);

    expect(view.getByRole("heading", { name: "Job search" })).toBeTruthy();
    expect(
      view
        .getByRole("button", { name: "Sign in" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/auth/sign-in");
    expect(view.getAllByRole("button")).toHaveLength(1);
    expect(page.textContent).not.toMatch(/hector/i);
  });
});
