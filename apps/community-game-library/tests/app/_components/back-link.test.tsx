import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { BackLink } from "@/app/_components/back-link";

describe("BackLink", () => {
  // Named for where it goes, not "Back" (recipes' D32). A link-styled button has the button
  // role, so its address is read from the link it renders.
  it("is a link named for the page it goes back to", () => {
    const view = render(<BackLink href="/loans" label="Loans" />);
    const back = view.getByRole("button", { name: "Loans" });
    expect(back.closest("a")?.getAttribute("href")).toBe("/loans");
  });
});
