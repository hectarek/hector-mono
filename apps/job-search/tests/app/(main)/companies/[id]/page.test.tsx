import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import CompanyPage from "@/app/(main)/companies/[id]/page";
import { saveCompany } from "@/app/actions/companies";
import { addJob, dismissProposal } from "@/app/actions/jobs";
import { NotFoundPage, type Redirected } from "@/tests/_support/next";
import { aProposal, dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const companyPage = async (id: string) =>
  within(
    await renderOnServer(
      await CompanyPage({ params: Promise.resolve({ id }) }),
    ),
  );

const add = async (facts: Record<string, unknown>) => {
  const result = await saveCompany(facts);
  if (!result.ok) throw new Error(`The save failed: ${result.code}`);
  return result.data.company;
};

describe("a company's page", () => {
  it("shows its facts and research, a warning of a similar name, and its history", async () => {
    signInAs("owner");
    const tag = crypto.randomUUID().slice(0, 8);
    const company = await add({
      name: `Acme Inc ${tag}`,
      website: "https://acme.example",
      headcount: 1250,
      officePolicy: "Hybrid, two days in the office",
      tier: 1,
      researchSummary: "A fictional anvil maker.",
      researchRef: "notes/acme-inc.md",
    });
    const similar = await add({ name: `ACME, inc. ${tag}` });

    const page = await companyPage(company.id);

    expect(page.getByRole("heading", { name: company.name })).toBeTruthy();
    expect(page.getByText("Tier 1")).toBeTruthy();
    const facts = within(page.getByRole("region", { name: "Facts" }));
    expect(
      facts
        .getByRole("link", { name: "https://acme.example" })
        .getAttribute("rel"),
    ).toBe("noopener noreferrer");
    expect(facts.getByText("1,250")).toBeTruthy();
    expect(facts.getByText("Hybrid, two days in the office")).toBeTruthy();
    const research = within(page.getByRole("region", { name: "Research" }));
    expect(research.getByText("A fictional anvil maker.")).toBeTruthy();
    expect(research.getByText("notes/acme-inc.md")).toBeTruthy();
    expect(
      page.getByRole("link", { name: similar.name }).getAttribute("href"),
    ).toBe(`/companies/${similar.id}`);
    const history = within(page.getByRole("region", { name: "History" }));
    expect(history.getByText("Created")).toBeTruthy();
    expect(
      page.getByRole("button", { name: "Edit" }).getAttribute("href"),
    ).toBe(`/companies/${company.id}/edit`);
    expect(page.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(page.queryByText("Only Hector")).toBeNull();
  });

  // KTD3: in Claude's session a human-only control shows, off, saying whose it is.
  it("shows Claude's session Delete off, as only Hector's", async () => {
    signInAs("owner");
    const company = await add({ name: "Fictional Widgets Co" });

    signInAs("agent");
    const page = await companyPage(company.id);

    expect(
      page.getByRole<HTMLButtonElement>("button", { name: "Delete" }).disabled,
    ).toBe(true);
    expect(page.getByText("Only Hector")).toBeTruthy();
    expect(page.getByRole("button", { name: "Edit" })).toBeTruthy();
  });

  it("is not found for an unknown or malformed id", async () => {
    signInAs("owner");
    for (const id of [crypto.randomUUID(), "not-an-id"]) {
      expect(
        await CompanyPage({ params: Promise.resolve({ id }) }).catch(
          (err: unknown) => err,
        ),
      ).toBeInstanceOf(NotFoundPage);
    }
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await CompanyPage({
      params: Promise.resolve({ id: crypto.randomUUID() }),
    }).catch((err: unknown) => err);
    expect((outcome as Redirected).url).toBe("/private");
  });

  it("lists the company's jobs, with a way to add one", async () => {
    signInAs("owner");
    const company = await add({ name: "Globex Corp" });
    const job = await addJob({
      companyId: company.id,
      role: "Widget engineer",
      source: "Referral",
    });
    if (!job.ok) throw new Error(`The job wasn't added: ${job.code}`);

    const page = await companyPage(company.id);

    const jobs = within(page.getByRole("region", { name: "Jobs" }));
    expect(
      within(jobs.getByRole("table"))
        .getByRole("link", { name: "Widget engineer" })
        .getAttribute("href"),
    ).toBe(`/jobs/${job.data.id}`);
    expect(
      jobs.getByRole("button", { name: "Add a job" }).getAttribute("href"),
    ).toBe(`/jobs/new?company=${company.id}`);
    expect(page.queryByRole("region", { name: "To review" })).toBeNull();
    expect(page.queryByRole("region", { name: "Dismissed" })).toBeNull();
  });

  // Each keeps the company from its delete, so the page shows them.
  it("lists the proposals that name the company, waiting or dismissed, under their own headings", async () => {
    signInAs("owner");
    const company = await add({ name: "Initech Labs" });
    const waiting = await aProposal(company.id, { role: "Gadget designer" });
    const dismissed = await aProposal(company.id, { role: "Anvil tester" });
    signInAs("owner");
    dataOf(await dismissProposal({ id: dismissed.id, reason: "wrong-level" }));

    const page = await companyPage(company.id);

    expect(
      within(page.getByRole("region", { name: "Jobs" })).getByText(
        "No jobs here yet.",
      ),
    ).toBeTruthy();
    expect(
      within(page.getByRole("region", { name: "To review" }))
        .getAllByRole("link", { name: "Gadget designer" })[0]
        ?.getAttribute("href"),
    ).toBe(`/jobs/${waiting.id}`);
    expect(
      within(page.getByRole("region", { name: "Dismissed" })).getAllByText(
        "Wrong level",
      ),
    ).not.toHaveLength(0);
  });
});
