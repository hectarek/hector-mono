import { beforeEach, expect, it } from "bun:test";
import {
  HumanOnlyError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import type { Job } from "@/src/entities/models/job.model";
import {
  addPersonSchema,
  type Person,
} from "@/src/entities/models/person.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = { actor: "agent", ownerId: OWNER };

describeEachBackend("deleting people and contacts", () => {
  let app: TestApp;
  let acme: string;
  let job: Job;
  let ada: Person;

  beforeEach(async () => {
    app = makeApp();
    const jobs = jobFixtures(app);
    acme = await jobs.company("Acme Inc");
    job = await jobs.add(acme);
    ada = await app.addPerson(
      HECTOR,
      addPersonSchema.parse({
        name: "Ada Example",
        companyId: acme,
        jobId: job.id,
      }),
    );
    await app.logInteraction(
      HECTOR,
      logInteractionSchema.parse({
        personIds: [ada.id],
        kind: "message-sent",
        jobId: job.id,
      }),
    );
  });

  it("refuses Claude's delete of a person, and logs the try (R21)", async () => {
    await expect(app.deletePerson(CLAUDE, { id: ada.id })).rejects.toThrow(
      HumanOnlyError,
    );

    expect((await app.getPerson(OWNER, { id: ada.id })).person.id).toBe(ada.id);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "person", id: ada.id },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({ action: "refused", reason: "delete" });
  });

  it("deletes Hector's way, with the person's interactions and contact links, and keeps their facts in the history", async () => {
    const deleted = await app.deletePerson(HECTOR, { id: ada.id });

    expect(deleted).toEqual({
      id: ada.id,
      name: "Ada Example",
      companyId: acme,
      jobIds: [job.id],
    });
    await expect(app.getPerson(OWNER, { id: ada.id })).rejects.toThrow(
      NotFoundError,
    );
    expect(await app.repos.interactions.listForPerson(OWNER, ada.id)).toEqual(
      [],
    );
    expect((await app.getJob(OWNER, { id: job.id })).contacts).toEqual([]);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "person", id: ada.id },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({
      action: "deleted",
      changes: expect.arrayContaining([
        { field: "name", before: "Ada Example", after: null },
      ]),
    });
  });

  it("refuses to delete a company that has people, naming them, and lists them on the company (U5's, moved)", async () => {
    await app.deleteJob(HECTOR, { id: job.id });

    await expect(app.deleteCompany(HECTOR, { id: acme })).rejects.toThrow(
      new InputParseError("Acme Inc has a person. Delete it first."),
    );
    expect((await app.getCompany(OWNER, { id: acme })).people).toEqual([
      { id: ada.id, name: "Ada Example", role: null, rank: null },
    ]);
  });

  it("takes a contact off a job Hector's way only, leaving the person's interactions as they were", async () => {
    await expect(
      app.removeContact(CLAUDE, { personId: ada.id, jobId: job.id }),
    ).rejects.toThrow(HumanOnlyError);

    await app.removeContact(HECTOR, { personId: ada.id, jobId: job.id });

    expect((await app.getJob(OWNER, { id: job.id })).contacts).toEqual([]);
    expect(
      (await app.getPerson(OWNER, { id: ada.id })).interactions,
    ).toHaveLength(1);
  });

  it("unlinks a deleted job's interactions, which stay on their people", async () => {
    await app.deleteJob(HECTOR, { id: job.id });

    const { interactions, jobs } = await app.getPerson(OWNER, { id: ada.id });
    expect(interactions.map(({ jobId }) => jobId)).toEqual([null]);
    expect(jobs).toEqual([]);
  });
});
