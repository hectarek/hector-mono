import { beforeEach, expect, it } from "bun:test";
import {
  type CompanyQuery,
  saveCompanySchema,
} from "@/src/entities/models/company.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const query = (narrower: Partial<CompanyQuery> = {}): CompanyQuery => ({
  limit: 20,
  offset: 0,
  ...narrower,
});

describeEachBackend("findCompanies", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const add = (ownerId: string, facts: Record<string, unknown>) =>
    app.saveCompany(
      { actor: "owner", ownerId },
      saveCompanySchema.parse(facts),
    );

  const names = async (narrower?: Partial<CompanyQuery>) =>
    (await app.findCompanies(OWNER, query(narrower))).companies.map(
      (company) => company.name,
    );

  it("lists the owner's companies by name, as a list shows them", async () => {
    await add(OWNER, {
      name: "Initech",
      industry: "Software",
      location: "Austin",
      tier: 3,
      researchSummary: "Not listed",
    });
    await add(OWNER, { name: "Globex" });
    await add(ANOTHER_OWNER, { name: "Another owner's" });

    const { companies, nextOffset } = await app.findCompanies(OWNER, query());
    expect(companies).toEqual([
      {
        id: expect.any(String),
        name: "Globex",
        industry: null,
        location: null,
        tier: null,
      },
      {
        id: expect.any(String),
        name: "Initech",
        industry: "Software",
        location: "Austin",
        tier: 3,
      },
    ]);
    expect(nextOffset).toBeNull();
  });

  it("finds names holding the query, case and punctuation ignored", async () => {
    await add(OWNER, { name: "Acme, Inc." });
    await add(OWNER, { name: "Acme Labs" });
    await add(OWNER, { name: "Globex" });

    expect(await names({ query: "acme inc" })).toEqual(["Acme, Inc."]);
    expect(await names({ query: "ACME" })).toEqual(["Acme, Inc.", "Acme Labs"]);
    expect(await names({ query: "lab" })).toEqual(["Acme Labs"]);
    expect(await names({ query: "Umbrella" })).toEqual([]);
  });

  it("answers a page at a time, with where the next page starts", async () => {
    for (const name of ["Delta Co", "Alpha Co", "Charlie Co", "Bravo Co"]) {
      await add(OWNER, { name });
    }

    const first = await app.findCompanies(OWNER, query({ limit: 3 }));
    expect(first.companies.map((company) => company.name)).toEqual([
      "Alpha Co",
      "Bravo Co",
      "Charlie Co",
    ]);
    expect(first.nextOffset).toBe(3);

    const second = await app.findCompanies(
      OWNER,
      query({ limit: 3, offset: 3 }),
    );
    expect(second.companies.map((company) => company.name)).toEqual([
      "Delta Co",
    ]);
    expect(second.nextOffset).toBeNull();
  });
});
