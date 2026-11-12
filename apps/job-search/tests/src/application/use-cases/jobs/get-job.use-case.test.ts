import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("getJob", () => {
  // get_job's answer (U6). Contacts come with U7, interview rounds with U12, fit with U15.
  it("answers with the job, its notes, status moves and latest changes", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const found = await jobs.byClaude(await jobs.company());
    await app.pinJob(HECTOR, { id: found.id, pinned: true });
    await app.moveJob(HECTOR, { id: found.id, status: "target" });
    const note = await app.addNote(CLAUDE, {
      record: { kind: "job", id: found.id },
      body: "A fictional note.",
    });

    const detail = await app.getJob(OWNER, { id: found.id });

    expect(detail.job).toMatchObject({
      id: found.id,
      status: "target",
      reason: "Matches the target role",
      company: found.company,
    });
    expect(detail.job.pinnedAt).toBeInstanceOf(Date);
    expect(detail.notes).toEqual([note]);
    expect(detail.moves).toEqual([
      expect.objectContaining({ from: "verify", to: "target" }),
    ]);
    expect(detail.activity.map((change) => change.action)).toEqual([
      "updated",
      "updated",
      "created",
    ]);
    // Claude added it (the UX plan's UX8).
    expect(detail.added).toEqual({ by: "agent", at: expect.any(Date) });
  });

  // The UX plan's UX8: a job's page shows its outreach.
  it("answers with the interactions linked to it, the latest first, each with its person", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());
    const ada = await app.addPerson(HECTOR, {
      name: "Ada Example",
      jobId: job.id,
    });
    const bo = await app.addPerson(HECTOR, { name: "Bo Example" });
    const log = (personId: string, occurredOn: string, linked: boolean) =>
      app.logInteraction(
        HECTOR,
        logInteractionSchema.parse({
          kind: "message-sent",
          personIds: [personId],
          occurredOn,
          ...(linked && { jobId: job.id }),
        }),
      );
    await log(ada.id, "2026-10-20", true);
    await log(bo.id, "2026-10-22", true);
    await log(ada.id, "2026-10-24", false);

    const { outreach } = await app.getJob(OWNER, { id: job.id });

    expect(
      outreach.map(({ interaction, person }) => [
        person.name,
        interaction.occurredOn,
      ]),
    ).toEqual([
      ["Bo Example", "2026-10-22"],
      ["Ada Example", "2026-10-20"],
    ]);
  });

  it("can't find another owner's job", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const theirs = await jobs.add(
      await jobs.company("Acme Inc", ANOTHER_OWNER),
      {},
      { actor: "owner", ownerId: ANOTHER_OWNER },
    );

    await expect(app.getJob(OWNER, { id: theirs.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
