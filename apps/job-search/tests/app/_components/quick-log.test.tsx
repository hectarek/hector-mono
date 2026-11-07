import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { QuickLog } from "@/app/_components/quick-log";
import { APP_TOASTER } from "@/app/_lib/notify";
import { saveCompany } from "@/app/actions/companies";
import { addPerson } from "@/app/actions/people";
import { getToday } from "@/app/actions/week";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// The test container's records live for the whole run, so each test names its own.
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

async function aCompanyNamed(name: string) {
  signInAs("owner");
  return dataOf(await saveCompany({ name })).company;
}

async function aPerson(name: string, facts: Record<string, unknown> = {}) {
  signInAs("owner");
  const added = dataOf(await addPerson({ name, ...facts }));
  return { id: added.id, name: added.name };
}

const interactionsOf = async (id: string) =>
  (await getInjection("IGetPersonController")({ id }, HECTOR)).interactions;

const personOf = async (id: string) =>
  (await getInjection("IGetPersonController")({ id }, HECTOR)).person;

const findPersonNamed = async (name: string) =>
  (
    await getInjection("IFindPeopleController")({ query: name }, HECTOR)
  ).people.find((person) => person.name === name);

// The log as a page holds it, with the toaster the shell mounts.
const log = (props: Parameters<typeof QuickLog>[0] = {}) =>
  render(
    <>
      <QuickLog {...props} />
      <Toaster id={APP_TOASTER} />
    </>,
  );

// The sheet renders in a portal, outside the trigger's container.
const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /^Log outreach/ }));
const tap = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const save = () => tap("Save");
const search = (text: string) =>
  fireEvent.change(screen.getByLabelText("Search people by name or company"), {
    target: { value: text },
  });

// 11:58 PM on Nov 6 in Eastern time, and four minutes later, past midnight.
const BEFORE_MIDNIGHT = new Date("2026-11-07T04:58:00Z");
const AFTER_MIDNIGHT = new Date("2026-11-07T05:02:00Z");

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  setSystemTime();
  toast.dismiss();
});

describe("the quick log", () => {
  it("keeps what happened, who and Save on the first screen, with the date, note and next step under More (UX5)", async () => {
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    open();

    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Message sent" })).toBeDefined();
    expect(screen.queryByLabelText("Date")).toBeNull();
    expect(screen.queryByLabelText("Note")).toBeNull();
    const more = screen.getByRole("button", { name: /^More/ });
    expect(more.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(more);

    expect(more.getAttribute("aria-expanded")).toBe("true");
    for (const label of ["Date", "Note", "Next step", "Next date"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
  });

  it("shows the day its sheet opens as the date, though the page loaded the day before", async () => {
    setSystemTime(BEFORE_MIDNIGHT);
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    setSystemTime(AFTER_MIDNIGHT);
    open();
    tap(/^More/);

    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-11-07");
  });

  it("logs on the day it's saved when the date wasn't changed, though the sheet opened the day before", async () => {
    setSystemTime(BEFORE_MIDNIGHT);
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });
    open();
    tap(/^More/);
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-11-06");

    setSystemTime(AFTER_MIDNIGHT);
    save();

    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({ occurredOn: "2026-11-07" }),
      ]),
    );
  });

  it("logs a sent message to the person it opens on with one tap, dated today (R8)", async () => {
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    open();
    save();

    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({
          kind: "message-sent",
          occurredOn: todayIn(PLAN_TIME_ZONE),
          author: "owner",
        }),
      ]),
    );
  });

  it("says what it logged, with Undo, which takes the log back", async () => {
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    open();
    save();
    await screen.findByText(`Logged: Message sent · ${ada.name}.`);
    tap("Undo");

    await screen.findByText("Put back as it was.");
    expect(await interactionsOf(ada.id)).toEqual([]);
  });

  it("logs a held conversation with the same one sheet and one tap", async () => {
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    open();
    tap("Conversation");
    save();

    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({ kind: "conversation", state: "held" }),
      ]),
    );
  });

  it("logs a conversation ahead of time with its start and end, which reaches This week's debriefs once it's over", async () => {
    // Monday, Nov 9, 10 am Eastern.
    setSystemTime(new Date("2026-11-09T15:00:00Z"));
    const ada = await aPerson(fictional("Ada"));
    log({ person: ada });

    open();
    tap("Conversation");
    tap("Coming up");
    fireEvent.change(screen.getByLabelText("Starts"), {
      target: { value: "2026-11-10T12:00" },
    });
    // The end follows the start, half an hour on, until it's set.
    expect(screen.getByLabelText("Ends")).toHaveProperty(
      "value",
      "2026-11-10T12:30",
    );
    save();

    // The times are wall times in Eastern time (KTD18), whatever the browser's zone, read as the
    // moments they name.
    const startsAt = new Date("2026-11-10T12:00:00-05:00");
    const endsAt = new Date("2026-11-10T12:30:00-05:00");
    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({
          kind: "conversation",
          state: "scheduled",
          startsAt,
          endsAt,
        }),
      ]),
    );
    const [conversation] = await interactionsOf(ada.id);

    setSystemTime(new Date(endsAt.getTime() + 60 * 60_000));
    signInAs("owner");
    const { decisions } = dataOf(await getToday({}));
    expect(
      decisions.debriefs.map((debrief) => debrief.conversation.id),
    ).toContain(conversation?.id ?? "");
  });

  it("finds people by their company's name, and shows each match's role and company", async () => {
    const company = await aCompanyNamed(fictional("Initech"));
    const peter = await aPerson(fictional("Peter"), {
      companyId: company.id,
      role: "Analyst",
    });
    log();

    open();
    search(company.name);
    const match = await screen.findByRole("button", {
      name: new RegExp(peter.name),
    });

    expect(match.textContent).toContain(`Analyst · ${company.name}`);
  });

  it("sends a batch to people picked by search, one interaction each", async () => {
    const grace = await aPerson(fictional("Grace"));
    const linus = await aPerson(fictional("Linus"));
    log();

    open();
    for (const person of [grace, linus]) {
      search(person.name);
      fireEvent.click(await screen.findByRole("button", { name: person.name }));
    }
    save();

    await waitFor(async () => {
      expect(await interactionsOf(grace.id)).toHaveLength(1);
      expect(await interactionsOf(linus.id)).toHaveLength(1);
    });
  });

  it("picks the first match on Enter in the search, rather than saving the log", async () => {
    const grace = await aPerson(fictional("Grace"));
    log();

    open();
    search(grace.name);
    await screen.findByRole("button", { name: grace.name });
    fireEvent.keyDown(
      screen.getByLabelText("Search people by name or company"),
      { key: "Enter" },
    );

    expect(
      screen.getByRole("button", { name: `Remove ${grace.name}` }),
    ).toBeDefined();
    expect(await interactionsOf(grace.id)).toEqual([]);
  });

  it("offers a picked person's jobs to link the log to", async () => {
    const company = await aCompanyNamed(fictional("Initech"));
    const job = await aJob(company.id);
    const peter = await aPerson(fictional("Peter"), {
      companyId: company.id,
      jobId: job.id,
    });
    log();

    open();
    search(peter.name);
    fireEvent.click(
      await screen.findByRole("button", { name: new RegExp(peter.name) }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: `${job.role} at ${company.name}`,
      }),
    );
    save();

    await waitFor(async () =>
      expect(await interactionsOf(peter.id)).toEqual([
        expect.objectContaining({ kind: "message-sent", jobId: job.id }),
      ]),
    );
  });

  it("offers a job's contacts in one tap from its page, and logs to them linked to the job, with no Undo", async () => {
    const company = await aCompanyNamed(fictional("Initech"));
    const job = await aJob(company.id);
    const peter = await aPerson(fictional("Peter"), {
      companyId: company.id,
      jobId: job.id,
    });
    log({
      jobs: [{ id: job.id, label: job.role }],
      jobId: job.id,
      contacts: [{ id: peter.id, name: peter.name, role: null, rank: null }],
    });

    open();
    tap(peter.name);
    save();

    await screen.findByText(`Logged: Message sent · ${peter.name}.`);
    expect(await interactionsOf(peter.id)).toEqual([
      expect.objectContaining({ kind: "message-sent", jobId: job.id }),
    ]);
    // Linking a job may have moved its date (R3), which deleting the log wouldn't put back.
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("adds someone a search doesn't find, by name, and logs to them", async () => {
    const name = fictional("Margaret");
    log();

    open();
    search(name);
    fireEvent.click(
      await screen.findByRole("button", { name: `Add “${name}”` }),
    );
    tap("Add person");
    await screen.findByRole("button", { name: `Remove ${name}` });
    save();

    await waitFor(async () => {
      const added = await findPersonNamed(name);
      expect(added).toBeDefined();
      expect(await interactionsOf(added?.id ?? "")).toHaveLength(1);
    });
  });

  it("adds someone at a listed company, however its name is typed, and refuses one that isn't listed", async () => {
    const company = await aCompanyNamed(fictional("Hooli Inc."));
    const name = fictional("Gavin");
    log();

    open();
    search(name);
    fireEvent.click(
      await screen.findByRole("button", { name: `Add “${name}”` }),
    );
    const companyField = screen.getByLabelText("New person's company");
    fireEvent.change(companyField, {
      target: { value: fictional("Nowhere") },
    });
    tap("Add person");
    await screen.findByText("Pick a company from the list, or add it first.");

    fireEvent.change(companyField, {
      target: { value: company.name.toUpperCase().replace(".", "") },
    });
    tap("Add person");
    await screen.findByRole("button", { name: `Remove ${name}` });

    const added = await findPersonNamed(name);
    expect(await personOf(added?.id ?? "")).toMatchObject({
      company: { id: company.id },
    });
  });
});
