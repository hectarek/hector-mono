import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  HumanOnlyError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import { isStaleCandidate } from "@/src/entities/job-lifecycle";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Interaction,
  type LoggedInteractions,
  logInteractionSchema,
} from "@/src/entities/models/interaction.model";
import { addPersonSchema } from "@/src/entities/models/person.model";
import { mondayOf } from "@/src/entities/week";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "log_interaction",
};

const log = (input: Record<string, unknown>) =>
  logInteractionSchema.parse(input);

// The one interaction a log wrote.
function only({ interactions }: LoggedInteractions): Interaction {
  const [interaction] = interactions;
  if (!interaction || interactions.length > 1) {
    throw new Error("Expected one interaction");
  }
  return interaction;
}

describeEachBackend("logInteraction", () => {
  let app: TestApp;
  let ada: string;

  // A Thursday, 11 am Eastern.
  beforeEach(async () => {
    setSystemTime(new Date("2026-10-29T15:00:00Z"));
    app = makeApp();
    ada = await addPerson("Ada Example");
  });

  afterEach(() => {
    setSystemTime();
  });

  async function addPerson(name: string): Promise<string> {
    return (await app.addPerson(HECTOR, addPersonSchema.parse({ name }))).id;
  }

  async function personOf(id: string) {
    return (await app.getPerson(OWNER, { id })).person;
  }

  it("dates a message on the day given, and the latest message is the person's messaged-on (KTD9)", async () => {
    await app.logInteraction(
      HECTOR,
      log({ personIds: [ada], kind: "message-sent", occurredOn: "2026-10-27" }),
    );
    expect((await personOf(ada)).messagedOn).toBe("2026-10-27");

    await app.logInteraction(
      HECTOR,
      log({ personIds: [ada], kind: "message-sent" }),
    );
    expect((await personOf(ada)).messagedOn).toBe("2026-10-29");
  });

  it("falls back to the message before when Hector deletes the latest", async () => {
    await app.logInteraction(
      HECTOR,
      log({ personIds: [ada], kind: "message-sent", occurredOn: "2026-10-20" }),
    );
    const latest = only(
      await app.logInteraction(
        HECTOR,
        log({
          personIds: [ada],
          kind: "message-sent",
          occurredOn: "2026-10-27",
        }),
      ),
    );

    await app.deleteInteraction(HECTOR, { id: latest.id });

    expect((await personOf(ada)).messagedOn).toBe("2026-10-20");
  });

  it("logs a batch of sent messages as an event and a change per person, in one call (R8)", async () => {
    const people = [ada, await addPerson("Grace"), await addPerson("Linus")];

    const { interactions } = await app.logInteraction(
      CLAUDE,
      log({ personIds: people, kind: "message-sent" }),
    );

    expect(interactions.map(({ personId }) => personId).sort()).toEqual(
      [...people].sort(),
    );
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "interaction" },
      limit: 20,
      offset: 0,
    });
    expect(entries).toHaveLength(3);
    expect(
      entries.every(
        ({ actor, tool }) => actor === "agent" && tool === "log_interaction",
      ),
    ).toBe(true);
  });

  it("dates a message logged at 9:30 pm Eastern on a Sunday, when the server's day is Monday, in the week that began the Monday before (AE4)", async () => {
    setSystemTime(new Date("2026-11-02T02:30:00Z"));

    const message = only(
      await app.logInteraction(
        HECTOR,
        log({ personIds: [ada], kind: "message-sent" }),
      ),
    );

    expect(message.occurredOn).toBe("2026-11-01");
    expect(mondayOf(message.occurredOn)).toBe("2026-10-26");
  });

  it("counts a scheduled conversation once it's held, not when it's cancelled or a no-show, and sets the person's next step as it ends (R8)", async () => {
    const schedule = async (startsAt: string, endsAt: string) =>
      only(
        await app.logInteraction(
          HECTOR,
          log({
            personIds: [ada],
            kind: "conversation",
            scheduled: { startsAt, endsAt },
          }),
        ),
      );
    const coffee = await schedule(
      "2026-10-28T14:00:00-04:00",
      "2026-10-28T14:30:00-04:00",
    );
    expect(coffee).toMatchObject({
      state: "scheduled",
      occurredOn: "2026-10-28",
    });
    expect((await personOf(ada)).metOn).toBeNull();

    await app.logInteraction(
      HECTOR,
      log({
        conversationId: coffee.id,
        outcome: "held",
        nextStep: "Send the deck",
        nextDate: "2026-10-30",
      }),
    );
    expect(await personOf(ada)).toMatchObject({
      metOn: "2026-10-28",
      nextStep: "Send the deck",
      nextDate: "2026-10-30",
    });

    const call = await schedule(
      "2026-10-29T09:00:00-04:00",
      "2026-10-29T09:30:00-04:00",
    );
    await app.logInteraction(
      HECTOR,
      log({ conversationId: call.id, outcome: "no-show" }),
    );
    expect((await personOf(ada)).metOn).toBe("2026-10-28");
  });

  it("takes the same outcome twice as once, and refuses another for a conversation that ended", async () => {
    const coffee = only(
      await app.logInteraction(
        HECTOR,
        log({
          personIds: [ada],
          kind: "conversation",
          scheduled: {
            startsAt: "2026-10-28T14:00:00-04:00",
            endsAt: "2026-10-28T14:30:00-04:00",
          },
        }),
      ),
    );
    const held = log({ conversationId: coffee.id, outcome: "held" });
    await app.logInteraction(CLAUDE, held);
    await app.logInteraction(CLAUDE, held);

    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "interaction", id: coffee.id },
      limit: 20,
      offset: 0,
    });
    expect(entries.map(({ action }) => action)).toEqual(["updated", "created"]);
    await expect(
      app.logInteraction(
        CLAUDE,
        log({ conversationId: coffee.id, outcome: "cancelled" }),
      ),
    ).rejects.toThrow(InputParseError);
  });

  it("moves an applied job's follow-up to 14 days after applied-on for a message linked to it, and makes the person its contact (R3, R1)", async () => {
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());
    await app.moveJob(HECTOR, {
      id: job.id,
      status: "applied",
      on: "2026-10-20",
    });

    await app.logInteraction(
      CLAUDE,
      log({ personIds: [ada], kind: "message-sent", jobId: job.id }),
    );

    const detail = await app.getJob(OWNER, { id: job.id });
    expect(detail.job.nextDate).toBe("2026-11-03");
    expect(detail.contacts.map(({ id }) => id)).toEqual([ada]);
    expect(detail.activity[0]).toMatchObject({
      actor: "agent",
      tool: "log_interaction",
      changes: [
        { field: "nextDate", before: "2026-10-27", after: "2026-11-03" },
      ],
    });
  });

  it("takes a reply linked to an applied job as the job's reply, so it's no longer a stale candidate (R3)", async () => {
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());
    await app.moveJob(HECTOR, {
      id: job.id,
      status: "applied",
      on: "2026-10-01",
    });
    const before = await app.getJob(OWNER, { id: job.id });
    expect(
      isStaleCandidate(
        { ...before.job, repliedOn: before.repliedOn },
        "2026-10-29",
      ),
    ).toBe(true);

    await app.logInteraction(
      HECTOR,
      log({ personIds: [ada], kind: "reply-received", jobId: job.id }),
    );

    const after = await app.getJob(OWNER, { id: job.id });
    expect(after.repliedOn).toBe("2026-10-29");
    expect(
      isStaleCandidate(
        { ...after.job, repliedOn: after.repliedOn },
        "2026-10-29",
      ),
    ).toBe(false);
  });

  it("refuses a day after today, and a person or job it can't find, writing nothing", async () => {
    await expect(
      app.logInteraction(
        HECTOR,
        log({
          personIds: [ada],
          kind: "message-sent",
          occurredOn: "2026-10-30",
        }),
      ),
    ).rejects.toThrow(InputParseError);
    await expect(
      app.logInteraction(
        HECTOR,
        log({ personIds: [crypto.randomUUID()], kind: "message-sent" }),
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      app.logInteraction(
        HECTOR,
        log({
          personIds: [ada],
          kind: "message-sent",
          jobId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow(NotFoundError);

    expect((await app.getPerson(OWNER, { id: ada })).interactions).toEqual([]);
  });

  it("refuses Claude's delete of an interaction, and logs the try (R21)", async () => {
    const message = only(
      await app.logInteraction(
        CLAUDE,
        log({ personIds: [ada], kind: "message-sent" }),
      ),
    );

    await expect(
      app.deleteInteraction(CLAUDE, { id: message.id }),
    ).rejects.toThrow(HumanOnlyError);

    expect((await app.getPerson(OWNER, { id: ada })).interactions).toHaveLength(
      1,
    );
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "interaction", id: message.id },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({
      action: "refused",
      actor: "agent",
      reason: "delete",
    });
  });
});

it("logs several people only for sent messages, and a conversation's schedule only for a conversation", () => {
  const person = crypto.randomUUID();
  const issues = (input: Record<string, unknown>) =>
    logInteractionSchema
      .safeParse(input)
      .error?.issues.map(({ path }) => path.join("."));

  expect(
    issues({
      personIds: [person, crypto.randomUUID()],
      kind: "reply-received",
    }),
  ).toEqual(["personIds"]);
  expect(
    issues({
      personIds: [person],
      kind: "message-sent",
      scheduled: {
        startsAt: "2026-10-28T14:00:00-04:00",
        endsAt: "2026-10-28T14:30:00-04:00",
      },
    }),
  ).toEqual(["scheduled"]);
  expect(
    issues({ conversationId: person, outcome: "held", kind: "message-sent" }),
  ).toEqual(["kind"]);
});
