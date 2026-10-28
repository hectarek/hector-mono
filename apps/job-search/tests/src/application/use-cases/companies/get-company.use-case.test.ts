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
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

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

  // get_company's answer (U5). Its people come with U7.
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
      jobs: [],
      people: [],
    });
  });

  it("can't find another owner's company", async () => {
    const theirs = await add(ANOTHER_OWNER, { name: "Acme Inc" });

    await expect(
      app.getCompany(OWNER, { id: theirs.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // From U5's scenarios, once jobs exist (U6).
  it("answers with the company's accepted jobs, compactly, and not its proposals", async () => {
    const jobs = jobFixtures(app);
    const company = await add(OWNER, { name: "Acme Inc" });
    const job = await jobs.add(company.id, { role: "Widget engineer" });
    await app.moveJob(HECTOR, { id: job.id, status: "target" });
    await jobs.propose(company.id, { role: "Proposed role" });

    expect((await app.getCompany(OWNER, { id: company.id })).jobs).toEqual([
      {
        id: job.id,
        role: "Widget engineer",
        company: { id: company.id, name: "Acme Inc", tier: null },
        status: "target",
        nextStep: null,
        nextDate: null,
        appliedOn: null,
        location: null,
        workMode: null,
        reviewState: "accepted",
        dismissReason: null,
      },
    ]);
  });
});
