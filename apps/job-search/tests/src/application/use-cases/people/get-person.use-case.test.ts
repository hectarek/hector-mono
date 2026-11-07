import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import {
  addPersonSchema,
  findPeopleSchema,
} from "@/src/entities/models/person.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("people", () => {
  let app: TestApp;
  let acme: string;

  beforeEach(async () => {
    app = makeApp();
    acme = await jobFixtures(app).company("Acme Inc");
  });

  it("adds a person at a company, logged, with none of the dates interactions give (R7, KTD9)", async () => {
    const ada = await app.addPerson(
      HECTOR,
      addPersonSchema.parse({
        name: "Ada Example",
        companyId: acme,
        role: "Engineering manager",
        howKnown: "A meetup",
        rank: "A",
        ask: "An intro to the platform team",
      }),
    );

    expect(ada).toMatchObject({
      name: "Ada Example",
      company: { id: acme, name: "Acme Inc" },
      role: "Engineering manager",
      rank: "A",
      messagedOn: null,
      repliedOn: null,
      metOn: null,
    });
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "person", id: ada.id },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({
      action: "created",
      changes: expect.arrayContaining([
        { field: "company", before: null, after: "Acme Inc" },
        { field: "name", before: null, after: "Ada Example" },
      ]),
    });
  });

  it("gets a person with their interactions, the latest first, and the jobs they're a contact for", async () => {
    const jobs = jobFixtures(app);
    const job = await jobs.add(acme);
    const ada = await app.addPerson(
      HECTOR,
      addPersonSchema.parse({ name: "Ada Example", jobId: job.id }),
    );
    const { interactions: logged } = await app.logInteraction(
      HECTOR,
      logInteractionSchema.parse({
        personIds: [ada.id],
        kind: "reply-received",
        occurredOn: "2026-10-01",
      }),
    );

    const detail = await app.getPerson(OWNER, { id: ada.id });

    expect(detail.person.repliedOn).toBe("2026-10-01");
    expect(detail.interactions.map(({ id }) => id)).toEqual(
      logged.map(({ id }) => id),
    );
    expect(detail.jobs.map(({ id }) => id)).toEqual([job.id]);
    expect(
      (await app.getJob(OWNER, { id: job.id })).contacts.map(({ id }) => id),
    ).toEqual([ada.id]);
  });

  it("finds people by name ignoring case, at a company, a page at a time", async () => {
    for (const name of ["ada example", "Ada Lovelace", "Grace Hopper"]) {
      await app.addPerson(
        HECTOR,
        addPersonSchema.parse({
          name,
          companyId: name === "Grace Hopper" ? null : acme,
        }),
      );
    }

    const page = await app.findPeople(
      OWNER,
      findPeopleSchema.parse({ query: "ADA", limit: 1 }),
    );
    expect(page.people.map(({ name }) => name)).toEqual(["Ada Lovelace"]);
    expect(page.nextOffset).toBe(1);
    expect(
      (
        await app.findPeople(OWNER, findPeopleSchema.parse({ companyId: acme }))
      ).people.map(({ name }) => name),
    ).toEqual(["Ada Lovelace", "ada example"]);
  });

  // The quick log's search (the UX plan's UX5): a company's name finds its people.
  it("finds people by their company's name too, ignoring case", async () => {
    for (const [name, companyId] of [
      ["Ada Lovelace", acme],
      ["Grace Hopper", null],
      ["Mae Acmesworth", null],
    ] as const) {
      await app.addPerson(HECTOR, addPersonSchema.parse({ name, companyId }));
    }

    const { people } = await app.findPeople(
      OWNER,
      findPeopleSchema.parse({ query: "ACME" }),
    );

    expect(people.map(({ name }) => name)).toEqual([
      "Ada Lovelace",
      "Mae Acmesworth",
    ]);
  });

  // R7 as revised 2026-11-07 (the UX plan's Q1): a next step always carries a date.
  it("dates a step given with no date a week out", async () => {
    const ada = await app.addPerson(
      HECTOR,
      addPersonSchema.parse({
        name: "Ada Lovelace",
        nextStep: "Ask for intro",
      }),
    );

    expect(ada.nextDate).toBe(addDays(todayIn(PLAN_TIME_ZONE), 7));
  });

  // The UX plan's UX6: People opens on its next steps, and lists the steps with no date apart.
  it("lists people by next step: late, today, upcoming, no date, then none, rank A first in each; and only the undated ones when asked", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const add = (name: string, facts: Record<string, unknown> = {}) =>
      app.addPerson(HECTOR, addPersonSchema.parse({ name, ...facts }));
    const step = (rank: string | null, days: number) => ({
      rank,
      nextStep: "Call",
      nextDate: addDays(today, days),
    });
    await add("Ann", step("B", -2));
    await add("Bea", step("A", -1));
    await add("Cal", step("C", 0));
    await add("Dee", step(null, 3));
    await add("Eve", step("A", 5));
    const fay = await add("Fay", { rank: "B" });
    await add("Gus");
    // A step with no date, as the import left some, before the rule.
    await app.repos.transactions.startTransaction((tx) =>
      app.repos.people.update(
        OWNER,
        fay.id,
        { nextStep: "Call", nextDate: null },
        tx,
      ),
    );
    const names = async (query: Record<string, unknown>) =>
      (await app.findPeople(OWNER, findPeopleSchema.parse(query))).people.map(
        ({ name }) => name,
      );

    expect(await names({ order: "next-step" })).toEqual([
      "Bea",
      "Ann",
      "Cal",
      "Eve",
      "Dee",
      "Fay",
      "Gus",
    ]);
    expect(await names({ undated: true })).toEqual(["Fay"]);
  });

  it("keeps another owner's people out of every read", async () => {
    const ada = await app.addPerson(
      { actor: "owner", ownerId: ANOTHER_OWNER },
      addPersonSchema.parse({ name: "Ada Example" }),
    );

    expect(
      (await app.findPeople(OWNER, findPeopleSchema.parse({}))).people,
    ).toEqual([]);
    await expect(app.getPerson(OWNER, { id: ada.id })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("refuses a company or job it can't find, adding no one", async () => {
    await expect(
      app.addPerson(
        HECTOR,
        addPersonSchema.parse({
          name: "Ada Example",
          companyId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      app.addPerson(
        HECTOR,
        addPersonSchema.parse({
          name: "Ada Example",
          jobId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow(NotFoundError);

    expect(
      (await app.findPeople(OWNER, findPeopleSchema.parse({}))).people,
    ).toEqual([]);
  });
});
