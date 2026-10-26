import { expect, it } from "bun:test";
import { HumanOnlyError } from "@/src/entities/errors/common";
import { describeEachBackend, makeApp, OWNER } from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("deleteNote", () => {
  it("is Hector's alone, and the history keeps the note's text", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());
    const note = await app.addNote(CLAUDE, {
      record: { kind: "job", id: job.id },
      body: "To delete.",
    });

    await expect(
      app.deleteNote(CLAUDE, { id: note.id }),
    ).rejects.toBeInstanceOf(HumanOnlyError);
    await app.deleteNote(HECTOR, { id: note.id });

    expect(
      await app.repos.notes.list(OWNER, { kind: "job", id: job.id }),
    ).toEqual([]);
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "note", id: note.id },
        limit: 20,
        offset: 0,
      })
    ).entries;
    expect(latest).toMatchObject({
      action: "deleted",
      changes: [{ field: "body", before: "To delete.", after: null }],
    });
  });
});
