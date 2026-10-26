import { beforeEach, expect, it } from "bun:test";
import { ConflictError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Company,
  type SaveCompanyRequest,
  saveCompanySchema,
} from "@/src/entities/models/company.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "save_company",
};
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

// save_company's input as its controller reads it.
const request = (input: unknown): SaveCompanyRequest =>
  saveCompanySchema.parse(input);

// A change to a company, made against what was read with it.
const changeTo = (company: Company, facts: Record<string, unknown>) =>
  request({
    id: company.id,
    updatedAt: company.updatedAt.toISOString(),
    ...facts,
  });

describeEachBackend("saveCompany", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const history = async (id: string) =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "company", id },
        limit: 20,
        offset: 0,
      })
    ).entries;

  it("creates the company Claude saves with facts, logged as Claude's through the tool", async () => {
    const saved = await app.saveCompany(
      CLAUDE,
      request({
        name: "Acme Inc",
        website: "https://acme.example",
        headcount: 250,
        tier: 2,
        researchSummary: "Makes fictional anvils.",
      }),
    );

    expect(saved).toEqual({
      company: {
        id: expect.any(String),
        name: "Acme Inc",
        website: "https://acme.example",
        location: null,
        headcount: 250,
        industry: null,
        officePolicy: null,
        leavePolicy: null,
        tier: 2,
        researchSummary: "Makes fictional anvils.",
        researchRef: null,
        updatedAt: expect.any(Date),
      },
      created: true,
      similar: [],
    });
    expect(await app.getCompany(OWNER, { id: saved.company.id })).toEqual({
      company: saved.company,
      similar: [],
      jobs: [],
    });
    expect(await history(saved.company.id)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "save_company",
        action: "created",
        changes: [
          { field: "name", before: null, after: "Acme Inc" },
          { field: "website", before: null, after: "https://acme.example" },
          { field: "headcount", before: null, after: 250 },
          { field: "tier", before: null, after: 2 },
          {
            field: "researchSummary",
            before: null,
            after: "Makes fictional anvils.",
          },
        ],
      }),
    ]);
  });

  it("creates a company whose name matches another's but for case and punctuation, and warns of the other", async () => {
    const acme = await app.saveCompany(HECTOR, request({ name: "Acme Inc" }));
    const saved = await app.saveCompany(
      CLAUDE,
      request({ name: "Acme, Inc." }),
    );

    expect(saved.created).toBe(true);
    expect(saved.company.id).not.toBe(acme.company.id);
    expect(saved.similar).toEqual([{ id: acme.company.id, name: "Acme Inc" }]);
    expect(
      (await app.getCompany(OWNER, { id: acme.company.id })).similar,
    ).toEqual([{ id: saved.company.id, name: "Acme, Inc." }]);
  });

  it("changes only the facts given, null clearing one, and logs each that changed, before and after", async () => {
    const { company } = await app.saveCompany(
      HECTOR,
      request({
        name: "Fictional Widgets",
        location: "Springfield",
        industry: "Widgets",
      }),
    );

    const saved = await app.saveCompany(
      CLAUDE,
      changeTo(company, {
        name: "Fictional Widgets",
        location: "Shelbyville",
        industry: null,
        tier: 1,
      }),
    );

    expect(saved.created).toBe(false);
    expect(saved.company).toMatchObject({
      name: "Fictional Widgets",
      location: "Shelbyville",
      industry: null,
      tier: 1,
    });
    expect(saved.company.updatedAt.getTime()).toBeGreaterThan(
      company.updatedAt.getTime(),
    );
    const [latest] = await history(company.id);
    expect(latest).toMatchObject({
      actor: "agent",
      tool: "save_company",
      action: "updated",
      changes: [
        { field: "location", before: "Springfield", after: "Shelbyville" },
        { field: "industry", before: "Widgets", after: null },
        { field: "tier", before: null, after: 1 },
      ],
    });
  });

  // R22: a change against a company that changed since it was read is caught, not lost.
  it("refuses a change made against an old updatedAt with the company as it is now, and changes nothing", async () => {
    const { company } = await app.saveCompany(
      HECTOR,
      request({ name: "Fictional Widgets" }),
    );
    const claudes = await app.saveCompany(
      CLAUDE,
      changeTo(company, { location: "Springfield" }),
    );

    const refusal = await app
      .saveCompany(HECTOR, changeTo(company, { location: "Shelbyville" }))
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(claudes.company);
    expect(
      (await app.getCompany(OWNER, { id: company.id })).company.location,
    ).toBe("Springfield");
    expect(await history(company.id)).toHaveLength(2);
  });

  it("leaves the company as it is, logging nothing, when a change sets what it already holds", async () => {
    const { company } = await app.saveCompany(
      HECTOR,
      request({ name: "Fictional Widgets", tier: 3 }),
    );

    const saved = await app.saveCompany(
      CLAUDE,
      changeTo(company, { name: "Fictional Widgets", tier: 3 }),
    );

    expect(saved.company).toEqual(company);
    expect(await history(company.id)).toHaveLength(1);
  });

  it("can't change a company that isn't the owner's, or doesn't exist", async () => {
    const theirs = await app.saveCompany(
      { actor: "owner", ownerId: ANOTHER_OWNER },
      request({ name: "Fictional Widgets" }),
    );

    await expect(
      app.saveCompany(
        HECTOR,
        changeTo(theirs.company, { location: "Springfield" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      app.saveCompany(
        HECTOR,
        changeTo(
          { ...theirs.company, id: crypto.randomUUID() },
          { location: "Springfield" },
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(
      (await app.getCompany(ANOTHER_OWNER, { id: theirs.company.id })).company
        .location,
    ).toBeNull();
  });

  it("warns only of the owner's own companies", async () => {
    await app.saveCompany(
      { actor: "owner", ownerId: ANOTHER_OWNER },
      request({ name: "Acme Inc" }),
    );

    const saved = await app.saveCompany(HECTOR, request({ name: "ACME inc" }));
    expect(saved.similar).toEqual([]);
  });
});
