import { beforeEach, expect, it } from "bun:test";
import { ConflictError, HumanOnlyError } from "@/src/entities/errors/common";
import type { Note } from "@/src/entities/models/note.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("editNote", () => {
  let app: TestApp;
  let note: Note;

  beforeEach(async () => {
    app = makeApp();
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());
    note = await app.addNote(CLAUDE, {
      record: { kind: "job", id: job.id },
      body: "A first draft.",
    });
  });

  const actionsOn = async (id: string) =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "note", id },
        limit: 20,
        offset: 0,
      })
    ).entries.map((change) => change.action);

  // R21: Claude's notes only append.
  it("refuses Claude's edit with HumanOnlyError, logging the refusal, and takes Hector's", async () => {
    await expect(
      app.editNote(CLAUDE, {
        id: note.id,
        updatedAt: note.updatedAt,
        body: "Rewritten",
      }),
    ).rejects.toBeInstanceOf(HumanOnlyError);

    const edited = await app.editNote(HECTOR, {
      id: note.id,
      updatedAt: note.updatedAt,
      body: "Edited by Hector.",
    });

    expect(edited.body).toBe("Edited by Hector.");
    expect(await actionsOn(note.id)).toEqual(["updated", "refused", "created"]);
  });

  it("refuses an edit made against an old updatedAt, with the note as it is now", async () => {
    const edited = await app.editNote(HECTOR, {
      id: note.id,
      updatedAt: note.updatedAt,
      body: "A second draft.",
    });

    const refusal = await app
      .editNote(HECTOR, {
        id: note.id,
        updatedAt: note.updatedAt,
        body: "A third draft.",
      })
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(edited);
  });
});
