import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import PrivacyPage from "@/app/(legal)/privacy/page";
import TermsPage from "@/app/(legal)/terms/page";

// Both open signed out (proxy.ts) and read nothing, so each renders on its own.
describe("the privacy policy and the terms of use", () => {
  it("are titled and dated, lead back to the app, give the contact address and link each other", () => {
    for (const [Page, title, other, otherHref] of [
      [PrivacyPage, "Privacy policy", "Terms of use", "/terms"],
      [TermsPage, "Terms of use", "Privacy policy", "/privacy"],
    ] as const) {
      const view = render(Page());
      expect(view.getByRole("heading", { level: 1 }).textContent).toBe(title);
      expect(view.getByText(/^Last updated \w+ \d+, \d{4}$/)).toBeTruthy();
      expect(
        view
          .getByRole("link", { name: "Back to Game Library" })
          .getAttribute("href"),
      ).toBe("/");
      expect(
        view
          .getByRole("link", { name: "hello@hectorfgonzalez.com" })
          .getAttribute("href"),
      ).toBe("mailto:hello@hectorfgonzalez.com");
      // A link-styled Button has the button role (AGENTS.md, Testing).
      expect(
        view
          .getByRole("button", { name: other })
          .closest("a")
          ?.getAttribute("href"),
      ).toBe(otherHref);
      view.unmount();
    }
  });

  it("the privacy policy links Google's user data policy, which its Google sign-in part follows", () => {
    const view = render(PrivacyPage());
    expect(
      view
        .getByRole("link", { name: "Google API Services User Data Policy" })
        .getAttribute("href"),
    ).toBe("https://developers.google.com/terms/api-services-user-data-policy");
  });

  it("the terms link the privacy policy where they name it", () => {
    const view = render(TermsPage());
    expect(
      view.getByRole("link", { name: "privacy policy" }).getAttribute("href"),
    ).toBe("/privacy");
  });
});
