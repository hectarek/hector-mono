import { describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import { currentTab, TabBar } from "@/app/_components/tab-bar";

// D14: four tabs, each with a count of what waits on the member there. The test router is on
// "/" (preload.ts), the Library.
describe("TabBar", () => {
  it("lists the four tabs in order and marks the current one", () => {
    const view = render(<TabBar placement="bottom" />);
    const nav = within(view.getByRole("navigation", { name: "Main" }));
    const tabs = nav.getAllByRole("link");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Library",
      "Nights",
      "Loans",
      "Friends",
    ]);
    expect(tabs.map((tab) => tab.getAttribute("href"))).toEqual([
      "/",
      "/nights",
      "/loans",
      "/friends",
    ]);
    expect(
      tabs.map((tab) => tab.getAttribute("aria-current") ?? "not current"),
    ).toEqual(["page", "not current", "not current", "not current"]);
  });

  it("says each count in its tab's name, and draws none where nothing waits", () => {
    const view = render(<TabBar placement="bottom" counts={{ loans: 2 }} />);
    const nav = within(view.getByRole("navigation", { name: "Main" }));

    const loans = nav.getByRole("link", { name: "Loans, 2 waiting" });
    expect(loans.querySelector('span[aria-hidden="true"]')?.textContent).toBe(
      "2",
    );
    expect(nav.getByRole("link", { name: "Nights" })).toBeTruthy();
  });

  // A pushed page keeps its tab lit; You, the inbox and the admin's pages light none.
  it("knows which tab each page belongs to", () => {
    expect(currentTab("/")).toBe("library");
    expect(currentTab("/my-library/add")).toBe("library");
    expect(currentTab("/games/0f1c")).toBe("library");
    expect(currentTab("/copies/0f1c")).toBe("library");
    expect(currentTab("/nights/0f1c/what-to-play")).toBe("nights");
    expect(currentTab("/loans/record")).toBe("loans");
    expect(currentTab("/friends/link")).toBe("friends");
    expect(currentTab("/friendsy")).toBeUndefined();
    expect(currentTab("/you")).toBeUndefined();
    expect(currentTab("/inbox")).toBeUndefined();
    expect(currentTab("/admin/games")).toBeUndefined();
    expect(currentTab(null)).toBeUndefined();
  });
});
