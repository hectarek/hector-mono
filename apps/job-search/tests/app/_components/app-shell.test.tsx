import { describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import { AppShell } from "@/app/_components/app-shell";

describe("the shell", () => {
  it("holds the quick log in the top bar, so outreach is logged from every page (UX5)", () => {
    const { container } = render(
      <AppShell>
        <p>A page</p>
      </AppShell>,
    );

    const topBar = container.querySelector("header");
    if (!topBar) throw new Error("The shell has no top bar");
    expect(
      within(topBar).getByRole("button", { name: "Log outreach" }),
    ).toBeDefined();
  });
});
