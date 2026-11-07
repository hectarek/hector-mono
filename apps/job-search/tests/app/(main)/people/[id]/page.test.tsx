import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import { withFrom } from "@/app/_lib/back-link";
import PersonPage from "@/app/(main)/people/[id]/page";
import { saveCompany } from "@/app/actions/companies";
import { logInteraction } from "@/app/actions/interactions";
import { addJob } from "@/app/actions/jobs";
import { addNote } from "@/app/actions/notes";
import { addPerson } from "@/app/actions/people";
import { dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const personPage = async (id: string) =>
  within(
    await renderOnServer(
      await PersonPage({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

const tag = () => crypto.randomUUID().slice(0, 8);

// A person at a company, a contact for a job there, with a message and a reply logged.
async function aPerson() {
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
    await addPerson({
      name: `Ada ${tag()}`,
      companyId: company.id,
      jobId: job.id,
      role: "Engineering manager",
      rank: "A",
      ask: "An intro to the platform team",
    }),
  );
  dataOf(
    await logInteraction({
      personIds: [person.id],
      kind: "message-sent",
      occurredOn: "2026-10-20",
      jobId: job.id,
      note: "Asked about the team.",
    }),
  );
  dataOf(
    await logInteraction({
      personIds: [person.id],
      kind: "reply-received",
      occurredOn: "2026-10-22",
    }),
  );
  return { company, job, person };
}

describe("a person's page", () => {
  it("shows their facts, the dates their interactions give them, their interactions and jobs, their notes, and their history", async () => {
    const { company, job, person } = await aPerson();
    dataOf(
      await addNote({
        record: { kind: "person", id: person.id },
        body: "A dated note.",
      }),
    );

    const page = await personPage(person.id);

    expect(page.getByRole("heading", { name: person.name })).toBeTruthy();
    expect(
      page.getByRole("link", { name: company.name }).getAttribute("href"),
    ).toBe(withFrom(`/companies/${company.id}`, `/people/${person.id}`));
    // The record header (the UX plan's UX8): the role in the facts line, and the rank.
    expect(page.getByText(/^· Engineering manager$/)).toBeTruthy();
    expect(page.getByText("Rank A")).toBeTruthy();
    // Next, with no step yet: the form sets one.
    const next = within(page.getByRole("region", { name: "Next" }));
    expect(next.getByText("No next step.")).toBeTruthy();
    expect(next.getByRole("button", { name: "Set one" })).toBeTruthy();
    const facts = within(page.getByRole("region", { name: "Facts" }));
    expect(facts.getByText("An intro to the platform team")).toBeTruthy();
    expect(facts.getByText("Oct 20, 2026")).toBeTruthy();
    expect(facts.getByText("Oct 22, 2026")).toBeTruthy();
    const interactions = within(
      page.getByRole("region", { name: "Interactions" }),
    );
    expect(interactions.getByText("Asked about the team.")).toBeTruthy();
    expect(
      interactions
        .getByRole("link", { name: `Widget engineer at ${company.name}` })
        .getAttribute("href"),
    ).toBe(withFrom(`/jobs/${job.id}`, `/people/${person.id}`));
    expect(
      interactions.getAllByRole("button", { name: "Delete" }),
    ).toHaveLength(2);
    // Their notes are dated entries, as a job's are (the UX plan's UX8).
    const notes = within(page.getByRole("region", { name: "Notes" }));
    expect(notes.getByText("A dated note.")).toBeTruthy();
    expect(notes.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(notes.getByRole("button", { name: "Add note" })).toBeTruthy();
    const history = within(page.getByRole("region", { name: "History" }));
    expect(history.getByText("Created")).toBeTruthy();
  });

  // KTD3: what only Hector may do shows, off, in Claude's session.
  it("shows Claude's session its delete off, and no interaction's delete", async () => {
    const { person } = await aPerson();
    signInAs("agent");

    const page = await personPage(person.id);

    expect(page.getByText("Only Hector")).toBeTruthy();
    const interactions = within(
      page.getByRole("region", { name: "Interactions" }),
    );
    expect(interactions.queryAllByRole("button", { name: "Delete" })).toEqual(
      [],
    );
  });
});
