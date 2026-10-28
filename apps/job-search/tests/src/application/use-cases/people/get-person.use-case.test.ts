import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import {
  addPersonSchema,
  findPeopleSchema,
} from "@/src/entities/models/person.model";
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
