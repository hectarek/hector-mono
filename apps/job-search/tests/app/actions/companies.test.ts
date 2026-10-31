import { beforeEach, describe, expect, it } from "bun:test";
import {
  deleteCompany,
  findCompanies,
  getCompany,
  saveCompany,
} from "@/app/actions/companies";
import type { ActionResult } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { Company } from "@/src/entities/models/company.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// The test container's companies live for the whole run, so each test names its own.
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.code}`);
  }
  return result.data;
}

const history = async (id: string) =>
  (
    await getInjection("IListActivityController")(
      { record: { kind: "company", id } },
      HECTOR,
    )
  ).entries;

const companyOf = async (name: string): Promise<Company> => {
  signInAs("owner");
  return dataOf(await saveCompany({ name })).company;
};

beforeEach(() => {
  nextState.revalidated = [];
});

describe("saveCompany", () => {
  it("creates the company Claude saves, logged as Claude's through the tool, and refreshes the pages that show it", async () => {
    signInAs("agent");
    const name = fictional("Acme Inc");

    const saved = dataOf(
      await saveCompany(
        { name, website: "https://acme.example", tier: 2 },
        "save_company",
      ),
    );

    expect(saved).toEqual({
      company: expect.objectContaining({
        name,
        website: "https://acme.example",
        tier: 2,
      }),
      created: true,
      similar: [],
    });
    expect(await history(saved.company.id)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "save_company",
        action: "created",
      }),
    ]);
    expect(nextState.revalidated).toEqual([
      "/companies",
      `/companies/${saved.company.id}`,
      "/agent",
    ]);
  });

  it("creates a company whose name matches another's but for case and punctuation, with a warning", async () => {
    const tag = crypto.randomUUID().slice(0, 8);
    const first = await companyOf(`Acme Inc ${tag}`);

    signInAs("agent");
    const saved = dataOf(
      await saveCompany({ name: `ACME, inc. ${tag}` }, "save_company"),
    );

    expect(saved.created).toBe(true);
    expect(saved.similar).toEqual([{ id: first.id, name: first.name }]);
  });

  it("answers input it can't read with `validation`, naming the field", async () => {
    signInAs("owner");
    const link = "Use an http or https link, like https://example.com";

    expect(
      await saveCompany({ name: "Fictional Co", website: "javascript:x" }),
    ).toEqual({
      ok: false,
      code: "validation",
      message: `Website: ${link}`,
      fields: { website: link },
    });
    expect(await saveCompany({ website: "https://example.com" })).toEqual({
      ok: false,
      code: "validation",
      message: "A company needs a name",
      fields: { name: "A company needs a name" },
    });
    expect(
      await saveCompany({ id: crypto.randomUUID(), location: "Springfield" }),
    ).toEqual({
      ok: false,
      code: "validation",
      message:
        "Send the updatedAt read with the company, so a change made since isn't overwritten",
      // Named, so a page tool's caller knows which field to send (U6's review).
      fields: {
        updatedAt:
          "Send the updatedAt read with the company, so a change made since isn't overwritten",
      },
    });
  });

  // R22: a change against a company that changed since it was read is caught.
  it("answers a change against an old updatedAt with `conflict` and the company as it is now", async () => {
    const company = await companyOf(fictional("Fictional Widgets"));
    const read = company.updatedAt.toISOString();

    signInAs("agent");
    const claudes = dataOf(
      await saveCompany(
        { id: company.id, updatedAt: read, location: "Springfield" },
        "save_company",
      ),
    );

    signInAs("owner");
    expect(
      await saveCompany({
        id: company.id,
        updatedAt: read,
        location: "Shelbyville",
      }),
    ).toEqual({
      ok: false,
      code: "conflict",
      message: "This changed since it was read.",
      current: claudes.company,
    });
  });

  it("answers a session the app can't act for with its code, and saves nothing", async () => {
    const name = fictional("Fictional Widgets");
    signInAs("stranger");
    expect(await saveCompany({ name })).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await saveCompany({ name })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });

    signInAs("owner");
    expect(dataOf(await findCompanies({ query: name })).companies).toEqual([]);
    expect(nextState.revalidated).toEqual([]);
  });
});

describe("deleteCompany", () => {
  // AE2's rule for deletes: the server refuses Claude, and the refusal is in the log.
  it("refuses Claude with `human-only`, logs the refusal, and keeps the company", async () => {
    const company = await companyOf(fictional("Fictional Widgets"));
    nextState.revalidated = [];

    signInAs("agent");
    expect(await deleteCompany({ id: company.id })).toEqual({
      ok: false,
      code: "human-only",
      message: "Only Hector can do this.",
    });

    signInAs("owner");
    expect(dataOf(await getCompany({ id: company.id })).company).toEqual(
      company,
    );
    const [refusal] = await history(company.id);
    expect(refusal).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "delete",
    });
    expect(nextState.revalidated).toEqual([]);
  });

  it("deletes Hector's company, logs it, and refreshes the pages that showed it", async () => {
    const company = await companyOf(fictional("Fictional Widgets"));
    nextState.revalidated = [];

    expect(await deleteCompany({ id: company.id })).toEqual({
      ok: true,
      data: { id: company.id, name: company.name },
      asOf: expect.any(String),
    });

    expect(await getCompany({ id: company.id })).toMatchObject({
      ok: false,
      code: "not-found",
    });
    const [deletion] = await history(company.id);
    expect(deletion).toMatchObject({ actor: "owner", action: "deleted" });
    expect(nextState.revalidated).toEqual([
      "/companies",
      `/companies/${company.id}`,
      "/agent",
    ]);
  });
});

describe("findCompanies and getCompany", () => {
  it("answer Claude's session with the owner's companies, and a company with any of a similar name", async () => {
    const tag = crypto.randomUUID().slice(0, 8);
    const company = await companyOf(`Globex ${tag}`);
    const similar = await companyOf(`GLOBEX ${tag}.`);

    signInAs("agent");
    // One name key, so they tie, and in any order.
    expect(
      dataOf(await findCompanies({ query: `globex ${tag}` }))
        .companies.map(({ id }) => id)
        .sort(),
    ).toEqual([company.id, similar.id].sort());
    expect(dataOf(await getCompany({ id: company.id }))).toEqual({
      company,
      similar: [{ id: similar.id, name: similar.name }],
      jobs: [],
      people: [],
    });
  });

  it("answer an unknown company with `not-found`, and a malformed id with `validation`", async () => {
    signInAs("owner");
    expect(await getCompany({ id: crypto.randomUUID() })).toEqual({
      ok: false,
      code: "not-found",
      message: "Couldn't find that company.",
    });
    // The id is named, since a page tool sends it (U6's review).
    expect(await getCompany({ id: "x" })).toMatchObject({
      ok: false,
      code: "validation",
      message: expect.stringMatching(/^Id: /),
      fields: { id: expect.any(String) },
    });
    expect(await findCompanies({ limit: 51 })).toMatchObject({
      ok: false,
      code: "validation",
      fields: { limit: expect.any(String) },
    });
  });

  it("answer a session the app can't act for with its code", async () => {
    signInAs("stranger");
    expect(await findCompanies({})).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await getCompany({ id: crypto.randomUUID() })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});
