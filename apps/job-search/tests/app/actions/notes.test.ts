import { beforeEach, describe, expect, it } from "bun:test";
import { saveCompany } from "@/app/actions/companies";
import { addJob } from "@/app/actions/jobs";
import { addNote, deleteNote, editNote } from "@/app/actions/notes";
import type { ActionResult } from "@/app/actions/shared";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.code}`);
  }
  return result.data;
}

const aJob = async () => {
  signInAs("owner");
  const { company } = dataOf(
    await saveCompany({ name: `Acme ${crypto.randomUUID().slice(0, 8)}` }),
  );
  return dataOf(
    await addJob({
      companyId: company.id,
      role: "Widget engineer",
      source: "Referral",
    }),
  ).id;
};

beforeEach(() => {
  nextState.revalidated = [];
});

describe("a job's notes", () => {
  it("take Claude's note through the tool, and refresh the job's page and Claude's", async () => {
    const jobId = await aJob();
    nextState.revalidated = [];
    signInAs("agent");

    const note = dataOf(
      await addNote(
        { record: { kind: "job", id: jobId }, body: "Saw it on a job board." },
        "add_note",
      ),
    );

    expect(note).toMatchObject({
      author: "agent",
      body: "Saw it on a job board.",
    });
    expect(nextState.revalidated).toEqual([`/jobs/${jobId}`, "/agent"]);
  });

  // R21: Claude's notes only append.
  it("refuse Claude's edit and delete with `human-only`, and take Hector's", async () => {
    const jobId = await aJob();
    signInAs("agent");
    const note = dataOf(
      await addNote({ record: { kind: "job", id: jobId }, body: "A draft." }),
    );
    const edit = {
      id: note.id,
      updatedAt: note.updatedAt.toISOString(),
      body: "Rewritten.",
    };

    expect(await editNote(edit)).toMatchObject({
      ok: false,
      code: "human-only",
    });
    expect(await deleteNote({ id: note.id })).toMatchObject({
      ok: false,
      code: "human-only",
    });

    signInAs("owner");
    expect(dataOf(await editNote(edit)).body).toBe("Rewritten.");
    expect(dataOf(await deleteNote({ id: note.id }))).toEqual({
      id: note.id,
      record: { kind: "job", id: jobId },
    });
  });

  it("answer a blank note with `validation`", async () => {
    const jobId = await aJob();
    expect(
      await addNote({ record: { kind: "job", id: jobId }, body: " " }),
    ).toMatchObject({
      ok: false,
      code: "validation",
      fields: { body: "A note needs some text" },
    });
  });
});
