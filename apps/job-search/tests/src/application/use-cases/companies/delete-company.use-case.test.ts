import { beforeEach, expect, it } from "bun:test";
import {
  HumanOnlyError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { saveCompanySchema } from "@/src/entities/models/company.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { jobFixtures } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = { actor: "agent", ownerId: OWNER };
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

describeEachBackend("deleteCompany", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const companyOf = async (ownerId: string, facts: Record<string, unknown>) =>
    (
      await app.saveCompany(
        { actor: "owner", ownerId },
        saveCompanySchema.parse(facts),
      )
    ).company;

  const history = async (id: string) =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "company", id },
        limit: 20,
        offset: 0,
      })
    ).entries;

  // R21: deleting is Hector's alone.
  it("refuses Claude with HumanOnlyError, logs the refusal, and keeps the company", async () => {
    const company = await companyOf(OWNER, { name: "Fictional Widgets" });

    await expect(
      app.deleteCompany(CLAUDE, { id: company.id }),
    ).rejects.toBeInstanceOf(HumanOnlyError);

    expect((await app.getCompany(OWNER, { id: company.id })).company).toEqual(
      company,
    );
    const [latest] = await history(company.id);
    expect(latest).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "delete",
    });
  });

  it("deletes Hector's company, its history keeping the facts it had", async () => {
    const company = await companyOf(OWNER, {
      name: "Fictional Widgets",
      tier: 3,
    });

    expect(await app.deleteCompany(HECTOR, { id: company.id })).toEqual({
      id: company.id,
      name: "Fictional Widgets",
    });

    await expect(
      app.getCompany(OWNER, { id: company.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    const [latest] = await history(company.id);
    expect(latest).toMatchObject({
      actor: "owner",
      action: "deleted",
      changes: [
        { field: "name", before: "Fictional Widgets", after: null },
        { field: "tier", before: 3, after: null },
      ],
    });
  });

  it("can't delete another owner's company, which stays", async () => {
    const theirs = await companyOf(ANOTHER_OWNER, {
      name: "Fictional Widgets",
    });

    await expect(
      app.deleteCompany(HECTOR, { id: theirs.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(
      (await app.getCompany(ANOTHER_OWNER, { id: theirs.id })).company,
    ).toEqual(theirs);
  });

  // From U5's scenarios, once jobs exist (U6).
  it("refuses Hector's delete of a company that has jobs, naming them by their review, and keeps it", async () => {
    const jobs = jobFixtures(app);
    const company = await companyOf(OWNER, { name: "Fictional Widgets" });
    await jobs.add(company.id);
    await jobs.propose(company.id);

    await expect(app.deleteCompany(HECTOR, { id: company.id })).rejects.toThrow(
      new InputParseError(
        "Fictional Widgets has a job and a proposal. Delete them first.",
      ),
    );
    expect((await app.getCompany(OWNER, { id: company.id })).company).toEqual(
      company,
    );
  });

  // A dismissed proposal keeps its posting from coming back (R20), so it keeps its company too.
  it("refuses the delete of a company whose only jobs are dismissed proposals", async () => {
    const jobs = jobFixtures(app);
    const company = await companyOf(OWNER, { name: "Fictional Widgets" });
    const proposeAndDismiss = async () => {
      const proposal = await jobs.propose(company.id);
      await app.reviewProposal(HECTOR, {
        id: proposal.id,
        updatedAt: proposal.updatedAt,
        decision: "dismiss",
        reason: "not-hiring",
        note: null,
      });
    };
    await proposeAndDismiss();
    await proposeAndDismiss();

    await expect(app.deleteCompany(HECTOR, { id: company.id })).rejects.toThrow(
      new InputParseError(
        "Fictional Widgets has 2 dismissed proposals. Delete them first.",
      ),
    );
  });
});
