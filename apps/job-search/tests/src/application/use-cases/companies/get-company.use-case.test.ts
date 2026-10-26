import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { saveCompanySchema } from "@/src/entities/models/company.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("getCompany", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const add = async (ownerId: string, facts: Record<string, unknown>) =>
    (
      await app.saveCompany(
        { actor: "owner", ownerId },
        saveCompanySchema.parse(facts),
      )
    ).company;

  // get_company's answer (U5). A company's accepted jobs come with U6, its people with U7.
  it("answers with the company, every fact, and the companies whose names match its own", async () => {
    const company = await add(OWNER, {
      name: "Acme Inc",
      website: "https://acme.example",
      location: "Springfield",
      headcount: 40,
      industry: "Anvils",
      officePolicy: "Hybrid, two days in the office",
      leavePolicy: "Twelve weeks of parental leave",
      tier: 1,
      researchSummary: "A fictional anvil maker.",
      researchRef: "notes/acme-inc.md",
    });
    const similar = await add(OWNER, { name: "ACME, inc" });
    await add(OWNER, { name: "Globex" });

    expect(await app.getCompany(OWNER, { id: company.id })).toEqual({
      company,
      similar: [{ id: similar.id, name: "ACME, inc" }],
    });
  });

  it("can't find another owner's company", async () => {
    const theirs = await add(ANOTHER_OWNER, { name: "Acme Inc" });

    await expect(
      app.getCompany(OWNER, { id: theirs.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
