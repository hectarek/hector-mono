import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import NewJobPage from "@/app/(main)/jobs/new/page";
import { addSource } from "@/app/actions/sources";
import { aCompany } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const newJobPage = async (params: Record<string, string>) =>
  within(
    await renderOnServer(
      await NewJobPage({ searchParams: Promise.resolve(params) }),
    ),
  );

describe("adding a job", () => {
  it("first picks the company, from a search", async () => {
    const companyId = await aCompany("Initech");

    signInAs("owner");
    const page = await newJobPage({ q: "initech" });

    expect(
      page
        .getAllByRole("link")
        .some(
          (link) =>
            link.getAttribute("href") === `/jobs/new?company=${companyId}`,
        ),
    ).toBe(true);
  });

  it("then opens the form at that company, suggesting the sources listed", async () => {
    const companyId = await aCompany("Globex");
    await addSource({ name: "Gadget Board" });

    const page = await newJobPage({ company: companyId });

    expect(
      page.getByRole("heading", { name: /Add a job at Globex/ }),
    ).toBeTruthy();
    expect(page.getByLabelText("Role")).toBeTruthy();
    expect(page.queryByLabelText("Applied on")).toBeNull();
    const suggestions = [
      ...document.querySelectorAll("#lead-sources option"),
    ].map((option) => option.getAttribute("value"));
    expect(suggestions).toContain("Gadget Board");
  });
});
