import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import CompaniesPage from "@/app/(main)/companies/page";
import { saveCompany } from "@/app/actions/companies";
import { Redirected } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

// The page as the server streams it, for a search (the test container's companies live for the
// whole run, so each test searches for its own).
const companiesPage = async (params: Record<string, string>) =>
  within(
    await renderOnServer(
      await CompaniesPage({ searchParams: Promise.resolve(params) }),
    ),
  );

const add = async (facts: Record<string, unknown>) => {
  const result = await saveCompany(facts);
  if (!result.ok) throw new Error(`The save failed: ${result.code}`);
  return result.data.company;
};

describe("the companies page", () => {
  it("lists the companies a search finds, each linked to its page, as a table and as cards", async () => {
    signInAs("owner");
    const tag = crypto.randomUUID().slice(0, 8);
    const company = await add({
      name: `Initech ${tag}`,
      industry: "Software",
      location: "Austin",
      tier: 3,
    });

    signInAs("agent");
    const page = await companiesPage({ q: tag });

    // The table's link, and the card's, which is the whole card.
    const links = page
      .getAllByRole("link")
      .filter(
        (link) => link.getAttribute("href") === `/companies/${company.id}`,
      );
    expect(links).toHaveLength(2);
    expect(
      within(page.getByRole("table")).getByRole("link", { name: company.name }),
    ).toBeTruthy();
    expect(page.getByRole("table")).toBeTruthy();
    expect(page.getByText("Software · Austin")).toBeTruthy();
    expect(page.getByText("Tier 3")).toBeTruthy();
    // A button that leads somewhere (Base UI's Button, rendered as a link).
    expect(
      page.getByRole("button", { name: "Add company" }).getAttribute("href"),
    ).toBe("/companies/new");
    expect(
      page.getByRole<HTMLInputElement>("searchbox", {
        name: "Search companies by name",
      }).value,
    ).toBe(tag);
  });

  it("says so when no company has the name searched", async () => {
    signInAs("owner");
    const page = await companiesPage({ q: crypto.randomUUID() });
    expect(page.getByText("No company by that name")).toBeTruthy();
    expect(page.queryByRole("table")).toBeNull();
  });

  it("pages through more companies than a page holds", async () => {
    signInAs("owner");
    const tag = crypto.randomUUID().slice(0, 8);
    for (let n = 0; n < 51; n += 1) {
      await add({ name: `Fictional ${tag} ${String(n).padStart(2, "0")}` });
    }

    const first = await companiesPage({ q: tag });
    expect(
      first.getByRole("button", { name: "Next" }).getAttribute("href"),
    ).toBe(`/companies?q=${tag}&offset=50`);
    expect(first.queryByRole("button", { name: "Previous" })).toBeNull();

    const second = await companiesPage({ q: tag, offset: "50" });
    expect(
      within(second.getByRole("table")).getByRole("link", {
        name: `Fictional ${tag} 50`,
      }),
    ).toBeTruthy();
    expect(second.queryByRole("button", { name: "Next" })).toBeNull();
    expect(
      second.getByRole("button", { name: "Previous" }).getAttribute("href"),
    ).toBe(`/companies?q=${tag}&offset=0`);
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await CompaniesPage({
      searchParams: Promise.resolve({}),
    }).catch((err: unknown) => err);
    expect(outcome).toBeInstanceOf(Redirected);
    expect((outcome as Redirected).url).toBe("/private");
  });
});
