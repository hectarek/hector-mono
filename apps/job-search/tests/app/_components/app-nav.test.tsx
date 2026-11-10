import { afterEach, describe, expect, it } from "bun:test";
import { Sidebar, SidebarProvider } from "@repo/ui/components/sidebar";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MainNav,
  MenuClose,
  TabTitle,
  TopBar,
} from "@/app/_components/app-nav";
import { nextState } from "@/tests/_support/next";

const LAPTOP = window.innerWidth;

// The shell's menu and top bar as AppShell puts them together.
const shell = () =>
  render(
    <SidebarProvider>
      <Sidebar>
        <MenuClose />
        <MainNav />
      </Sidebar>
      <TopBar />
    </SidebarProvider>,
  );

// How wide the window is, which the sidebar reads when it mounts to tell a phone from a laptop.
const widen = (width: number) =>
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

afterEach(() => {
  nextState.pathname = "/";
  widen(LAPTOP);
});

describe("the tab's title", () => {
  // The UX plan's Q9: a tab can be seen over a shoulder, so no title names a company or a person.
  it("names each page by its section, and a record's page by what it is, never by the record", () => {
    const titles = Object.fromEntries(
      [
        "/",
        "/week",
        "/jobs",
        "/jobs/new",
        "/jobs/a-job",
        "/jobs/a-job/edit",
        "/companies/a-company",
        "/companies/a-company/edit",
        "/people/new",
        "/people/a-person",
        "/practice/new",
        "/practice/a-session",
        "/agent",
        "/settings",
        "/nowhere",
      ].map((path) => {
        nextState.pathname = path;
        const view = render(<TabTitle />);
        const title = document.title;
        view.unmount();
        return [path, title];
      }),
    );

    expect(titles).toEqual({
      "/": "Today · Job search",
      "/week": "Weekly review · Job search",
      "/jobs": "Jobs · Job search",
      "/jobs/new": "Add a job · Job search",
      "/jobs/a-job": "Job · Job search",
      "/jobs/a-job/edit": "Edit job · Job search",
      "/companies/a-company": "Company · Job search",
      "/companies/a-company/edit": "Edit company · Job search",
      "/people/new": "Add a person · Job search",
      "/people/a-person": "Person · Job search",
      "/practice/new": "Log a practice session · Job search",
      "/practice/a-session": "Practice session · Job search",
      "/agent": "Claude · Job search",
      "/settings": "Settings · Job search",
      "/nowhere": "Job search",
    });
  });
});

describe("the menu", () => {
  it("is a nav named Main whose current section is marked as the page", () => {
    nextState.pathname = "/jobs";
    shell();

    const nav = screen.getByRole("navigation", { name: "Main" });
    const current = nav.querySelectorAll("[aria-current]");
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("Jobs");
    expect(current[0]?.getAttribute("aria-current")).toBe("page");
  });

  it("marks a record's section as current, but not as the page, on the record's page", () => {
    nextState.pathname = "/people/a-person";
    shell();

    const current = screen
      .getByRole("navigation", { name: "Main" })
      .querySelectorAll("[aria-current]");
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("People");
    expect(current[0]?.getAttribute("aria-current")).toBe("true");
  });

  it("marks Today only on its own page, not on every path under it", () => {
    nextState.pathname = "/week";
    shell();

    const current = screen
      .getByRole("navigation", { name: "Main" })
      .querySelectorAll("[aria-current]");
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("Weekly review");
  });

  it("on a phone, opens from the Menu button, shows a close button, and closes when a section is tapped", async () => {
    widen(375);
    nextState.pathname = "/people";
    shell();

    // The phone's top bar names the section, since the menu that marks it is hidden.
    expect(screen.getByText("People")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const nav = await screen.findByRole("navigation", { name: "Main" });
    // The 44 px close. The registry sheet's own 28 px one is hidden by a class, which happy-dom
    // doesn't apply.
    expect(
      screen
        .getAllByRole("button", { name: "Close" })
        .some((button) => button.classList.contains("min-h-11")),
    ).toBe(true);

    const jobs = [...nav.querySelectorAll("a")].find(
      (link) => link.textContent === "Jobs",
    );
    if (!jobs) throw new Error("No Jobs link");
    jobs.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(jobs);

    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull(),
    );
  });
});
