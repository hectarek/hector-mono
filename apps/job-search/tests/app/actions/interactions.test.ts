import { beforeEach, describe, expect, it } from "bun:test";
import { saveCompany } from "@/app/actions/companies";
import { deleteInteraction, logInteraction } from "@/app/actions/interactions";
import { addJob } from "@/app/actions/jobs";
import {
  addPerson,
  deletePerson,
  getPerson,
  removeContact,
  updatePerson,
} from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/shared";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.code}`);
  }
  return result.data;
}

const tag = () => crypto.randomUUID().slice(0, 8);

// A company, a job at it, and a person at it, made in Hector's session.
async function aContact() {
  signInAs("owner");
  const { company } = dataOf(await saveCompany({ name: `Acme ${tag()}` }));
  const job = dataOf(
    await addJob({
      companyId: company.id,
      role: "Widget engineer",
      source: "Referral",
    }),
  );
  const person = dataOf(
    await addPerson({ name: `Ada ${tag()}`, companyId: company.id }),
  );
  return { companyId: company.id, jobId: job.id, person };
}

beforeEach(() => {
  nextState.revalidated = [];
});

describe("the outreach log", () => {
  it("takes Claude's batch of sent messages through the tool, and refreshes the people, the job and Claude's page", async () => {
    const { jobId, person } = await aContact();
    const other = dataOf(await addPerson({ name: `Grace ${tag()}` }));
    nextState.revalidated = [];
    signInAs("agent");

    const { interactions } = dataOf(
      await logInteraction(
        {
          personIds: [person.id, other.id],
          kind: "message-sent",
          jobId,
        },
        "log_interaction",
      ),
    );

    expect(interactions).toHaveLength(2);
    expect(interactions.every(({ author }) => author === "agent")).toBe(true);
    expect(nextState.revalidated).toEqual([
      "/",
      "/people",
      `/people/${person.id}`,
      "/jobs",
      `/jobs/${jobId}`,
      `/people/${other.id}`,
      "/agent",
    ]);
  });

  it("answers `validation`, naming the field, for several people with a reply", async () => {
    const { person } = await aContact();
    const other = dataOf(await addPerson({ name: `Grace ${tag()}` }));

    expect(
      await logInteraction({
        personIds: [person.id, other.id],
        kind: "reply-received",
      }),
    ).toMatchObject({
      ok: false,
      code: "validation",
      fields: { personIds: expect.any(String) },
    });
  });

  // R21: deleting is Hector's alone.
  it("refuses Claude's delete of an interaction, a person or a contact with `human-only`, and takes Hector's", async () => {
    const { jobId, person } = await aContact();
    const { interactions } = dataOf(
      await logInteraction({
        personIds: [person.id],
        kind: "message-sent",
        jobId,
      }),
    );
    const id = interactions[0]?.id ?? "";
    signInAs("agent");

    expect(await deleteInteraction({ id })).toMatchObject({
      ok: false,
      code: "human-only",
    });
    expect(await deletePerson({ id: person.id })).toMatchObject({
      ok: false,
      code: "human-only",
    });
    expect(await removeContact({ personId: person.id, jobId })).toMatchObject({
      ok: false,
      code: "human-only",
    });

    signInAs("owner");
    expect(await deleteInteraction({ id })).toMatchObject({ ok: true });
    expect(await removeContact({ personId: person.id, jobId })).toMatchObject({
      ok: true,
    });
    expect(await deletePerson({ id: person.id })).toMatchObject({ ok: true });
    expect(await getPerson({ id: person.id })).toMatchObject({
      ok: false,
      code: "not-found",
    });
  });
});

describe("people", () => {
  it("adds a person as a job's contact, refreshing the job's page too", async () => {
    const { companyId, jobId } = await aContact();
    nextState.revalidated = [];

    const person = dataOf(
      await addPerson({ name: `Linus ${tag()}`, companyId, jobId }),
    );

    expect(nextState.revalidated).toEqual([
      "/",
      "/people",
      `/people/${person.id}`,
      `/companies/${companyId}`,
      "/agent",
      `/jobs/${jobId}`,
    ]);
  });

  it("answers `conflict` with the person as they are now for a change made against an older read", async () => {
    const { person } = await aContact();
    const read = person.updatedAt.toISOString();
    dataOf(await updatePerson({ id: person.id, updatedAt: read, rank: "A" }));

    expect(
      await updatePerson({ id: person.id, updatedAt: read, rank: "B" }),
    ).toMatchObject({
      ok: false,
      code: "conflict",
      current: { id: person.id, rank: "A" },
    });
  });
});
