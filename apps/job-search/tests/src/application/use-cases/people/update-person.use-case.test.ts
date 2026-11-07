import { beforeEach, expect, it } from "bun:test";
import { z } from "zod";
import { ConflictError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  addPersonSchema,
  type Person,
  updatePersonSchema,
} from "@/src/entities/models/person.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "update_person",
};

describeEachBackend("updatePerson", () => {
  let app: TestApp;
  let ada: Person;

  beforeEach(async () => {
    app = makeApp();
    ada = await app.addPerson(
      HECTOR,
      addPersonSchema.parse({
        name: "Ada Example",
        role: "Engineer",
        rank: "B",
      }),
    );
  });

  const update = (input: Record<string, unknown>, context = CLAUDE) =>
    app.updatePerson(context, updatePersonSchema.parse(input));

  // R7 as revised 2026-11-07 (the UX plan's Q1): a next step always carries a date.
  it("dates a step a change gives with no date a week out, and keeps a date a change gives", async () => {
    const weekOut = addDays(todayIn(PLAN_TIME_ZONE), 7);
    const stepped = await update({
      id: ada.id,
      updatedAt: ada.updatedAt.toISOString(),
      nextStep: "Send the deck",
    });
    expect(stepped).toMatchObject({
      nextStep: "Send the deck",
      nextDate: weekOut,
    });

    const cleared = await update({
      id: ada.id,
      updatedAt: stepped.updatedAt.toISOString(),
      nextDate: null,
    });
    expect(cleared.nextDate).toBe(weekOut);
  });

  it("leaves an old step with no date as it is when a change sets neither the step nor the date", async () => {
    // As an import left one, before the rule.
    const undated = await app.repos.transactions.startTransaction((tx) =>
      app.repos.people.update(
        OWNER,
        ada.id,
        { nextStep: "Ask about the team", nextDate: null },
        tx,
      ),
    );

    const updated = await update({
      id: ada.id,
      updatedAt: undated.updatedAt.toISOString(),
      rank: "A",
    });

    expect(updated).toMatchObject({
      nextStep: "Ask about the team",
      nextDate: null,
    });
  });

  it("changes only the fields sent, against the updatedAt read with the person, and logs each change (R22)", async () => {
    const updated = await update({
      id: ada.id,
      updatedAt: ada.updatedAt.toISOString(),
      rank: "A",
      ask: "An intro",
    });

    expect(updated).toMatchObject({
      name: "Ada Example",
      role: "Engineer",
      rank: "A",
      ask: "An intro",
    });
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "person", id: ada.id },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({
      actor: "agent",
      tool: "update_person",
      action: "updated",
      changes: [
        { field: "rank", before: "B", after: "A" },
        { field: "ask", before: null, after: "An intro" },
      ],
    });
  });

  it("refuses a change made against an older read, answering with the person as they are now", async () => {
    const read = ada.updatedAt.toISOString();
    await update({ id: ada.id, updatedAt: read, role: "Staff engineer" });

    const conflict = await update({ id: ada.id, updatedAt: read, rank: "C" })
      .then(() => undefined)
      .catch((err: unknown) => err);

    expect(conflict).toBeInstanceOf(ConflictError);
    expect((conflict as ConflictError).current).toMatchObject({
      id: ada.id,
      role: "Staff engineer",
      rank: "B",
    });
  });

  it("writes and logs nothing for a change that sets what's already there", async () => {
    const same = await update({
      id: ada.id,
      updatedAt: ada.updatedAt.toISOString(),
      rank: "B",
    });

    expect(same.updatedAt).toEqual(ada.updatedAt);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "person", id: ada.id },
      limit: 20,
      offset: 0,
    });
    expect(entries.map(({ action }) => action)).toEqual(["created"]);
  });
});

it("has no field for the dates a person's interactions give them (KTD9)", () => {
  const { properties } = z.toJSONSchema(updatePersonSchema, {
    io: "input",
  }) as { properties: Record<string, unknown> };

  for (const derived of ["messagedOn", "repliedOn", "metOn"]) {
    expect(properties).not.toHaveProperty(derived);
  }
  expect(
    updatePersonSchema.parse({
      id: crypto.randomUUID(),
      updatedAt: "2026-10-28T12:00:00Z",
      messagedOn: "2026-10-01",
    }),
  ).not.toHaveProperty("messagedOn");
});
