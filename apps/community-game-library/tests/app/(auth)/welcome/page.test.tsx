import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import WelcomePage from "@/app/(auth)/welcome/page";

describe("the welcome page", () => {
  it("shows the app's name", () => {
    const view = render(<WelcomePage />);
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Community Game Library",
    );
  });
});
