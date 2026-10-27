import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("getJob", () => {
  // get_job's answer (U6). Contacts come with U7, interview rounds with U12, fit with U15.
  it("answers with the job, whatever its review, its notes, status moves and latest changes", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const proposal = await jobs.propose(await jobs.company());
    const accepted = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      decision: "accept",
    });
    await app.moveJob(HECTOR, { id: proposal.id, status: "target" });
    const note = await app.addNote(CLAUDE, {
      record: { kind: "job", id: proposal.id },
      body: "A fictional note.",
    });

    const detail = await app.getJob(OWNER, { id: proposal.id });

    expect(detail.job).toMatchObject({
      id: proposal.id,
      reviewState: "accepted",
      status: "target",
      company: accepted.company,
    });
    expect(detail.notes).toEqual([note]);
    expect(detail.moves).toEqual([
      expect.objectContaining({ from: "verify", to: "target" }),
    ]);
    expect(detail.activity.map((change) => change.action)).toEqual([
      "updated",
      "updated",
      "created",
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
