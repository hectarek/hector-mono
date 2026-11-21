import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { BackLink } from "@/app/_components/back-link";

describe("BackLink", () => {
  // Named for where it goes, not "Back" (recipes' D32; screens.md rule 11): the chevron and the
  // page's name in stencil, one link, read out as "Back to Loans".
  it("is a link named for the page it goes back to", () => {
    const view = render(<BackLink href="/loans" label="Loans" />);
    const back = view.getByRole("link", { name: "Back to Loans" });
    expect(back.getAttribute("href")).toBe("/loans");
    expect(back.textContent).toBe("Loans");
  });
});
