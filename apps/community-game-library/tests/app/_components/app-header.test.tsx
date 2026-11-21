import { describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { AppBar, AppHeader } from "@/app/_components/app-header";
import { NoConnection } from "@/app/_components/no-connection";

// The design system's Header: a tab's title with the bell and the piece, or a pushed page's
// way back named for the page that opened it.
describe("AppHeader", () => {
  it("titles a tab's first screen, with its action, the bell and You", () => {
    const view = render(
      <AppHeader
        title="Loans"
        action={<button type="button">Record a loan</button>}
      />,
    );
    const title = view.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe("Loans");
    expect(title.className).toContain("font-heading");
    expect(view.getByRole("button", { name: "Record a loan" })).toBeTruthy();
    expect(view.getByRole("link", { name: "Inbox" }).getAttribute("href")).toBe(
      "/inbox",
    );
    expect(view.getByRole("link", { name: "You" }).getAttribute("href")).toBe(
      "/you",
    );
  });

  it("names a pushed page's way back for where it goes, and has no title of its own", () => {
    const view = render(<AppHeader back={{ href: "/", label: "Library" }} />);
    const back = view.getByRole("link", { name: "Back to Library" });
    expect(back.getAttribute("href")).toBe("/");
    expect(back.textContent).toBe("Library");
    expect(view.queryAllByRole("heading")).toHaveLength(0);
  });
});

// From 768px: the app's name, the four tabs, the bell and the piece (KTD14).
describe("AppBar", () => {
  it("holds the app's name, the tabs, the bell and You", () => {
    const view = render(<AppBar />);
    expect(view.getByText("Game Library").textContent).toBe(
      "Community Game Library",
    );
    expect(view.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(view.getByRole("link", { name: "Inbox" })).toBeTruthy();
    expect(view.getByRole("link", { name: "You" })).toBeTruthy();
  });
});

// screens.md, When something goes wrong: the screen says so and never fails silently.
describe("NoConnection", () => {
  it("says so while the phone is offline", () => {
    const online = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      "onLine",
    );
    let offline = false;
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => !offline,
    });
    try {
      const view = render(<NoConnection />);
      expect(view.queryByRole("status") === null).toBe(true);

      offline = true;
      fireEvent(window, new Event("offline"));
      expect(view.getByRole("status").textContent).toBe(
        "No connection. Showing what you last saw.",
      );

      offline = false;
      fireEvent(window, new Event("online"));
      expect(view.queryByRole("status") === null).toBe(true);
    } finally {
      Reflect.deleteProperty(navigator, "onLine");
      if (online) Object.defineProperty(Navigator.prototype, "onLine", online);
    }
  });
});
