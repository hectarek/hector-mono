import { beforeEach, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { NoteRecord } from "@/src/entities/models/note.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { jobFixtures } from "@/tests/_support/jobs";

const THEM: ChangeContext = { actor: "owner", ownerId: ANOTHER_OWNER };

describeEachBackend("the notes repository", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  // KTD2: every query takes the owner's id, and another owner's notes stay out of it.
  it("keeps another owner's notes out of every read and write", async () => {
    const jobs = jobFixtures(app);
    const theirJob = await jobs.add(
      await jobs.company("Initech", ANOTHER_OWNER),
      {},
      THEM,
    );
    const record: NoteRecord = { kind: "job", id: theirJob.id };
    const note = await app.addNote(THEM, { record, body: "Their note." });
    const repo = app.repos.notes;

    expect(await repo.list(OWNER, record)).toEqual([]);
    await app.repos.transactions.startTransaction(async (tx) => {
      expect(await repo.getForUpdate(OWNER, note.id, tx)).toBeUndefined();
      await repo.delete(OWNER, note.id, tx);
      await repo.deleteFor(OWNER, record, tx);
    });
    await expect(
      app.repos.transactions.startTransaction((tx) =>
        repo.update(OWNER, note.id, "Not theirs any more.", tx),
      ),
    ).rejects.toBeInstanceOf(DatabaseOperationError);

    expect(await repo.list(ANOTHER_OWNER, record)).toEqual([note]);
  });
});
