import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { RecordNotes } from "@/app/_components/record-notes";
import { getJob } from "@/app/actions/jobs";
import { addNote, editNote } from "@/app/actions/notes";
import { addPerson, getPerson } from "@/app/actions/people";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const notesOf = async (id: string) => dataOf(await getJob({ id })).notes;

describe("a record's notes", () => {
  it("add a note, signed by whoever added it", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    const view = render(
      <RecordNotes
        record={{ kind: "job", id: job.id }}
        notes={[]}
        canEdit={false}
      />,
    );

    expect(view.getByText("No notes yet.")).toBeTruthy();
    fireEvent.change(view.getByLabelText("New note"), {
      target: { value: "Saw it on a job board." },
    });
    const form = view.getByLabelText("New note").closest("form");
    if (!form) throw new Error("No form");
    fireEvent.submit(form);

    await waitFor(async () =>
      expect(await notesOf(job.id)).toEqual([
        expect.objectContaining({
          author: "agent",
          body: "Saw it on a job board.",
        }),
      ]),
    );
    expect(view.getByLabelText("New note")).toHaveProperty("value", "");
  });

  // The UX plan's UX8: a person's notes are dated entries, as a job's are.
  it("add a note to a person", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({ name: `Fictional ${crypto.randomUUID().slice(0, 8)}` }),
    );
    const view = render(
      <RecordNotes
        record={{ kind: "person", id: person.id }}
        notes={[]}
        canEdit
      />,
    );

    fireEvent.change(view.getByLabelText("New note"), {
      target: { value: "Met at a meetup." },
    });
    const form = view.getByLabelText("New note").closest("form");
    if (!form) throw new Error("No form");
    fireEvent.submit(form);

    await waitFor(async () =>
      expect(dataOf(await getPerson({ id: person.id })).notes).toEqual([
        expect.objectContaining({ author: "owner", body: "Met at a meetup." }),
      ]),
    );
  });

  it("let Hector edit a note in place, and show Claude's session Edit and Delete off, as only Hector's", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    const note = dataOf(
      await addNote({ record: { kind: "job", id: job.id }, body: "A draft." }),
    );

    const claudes = render(
      <RecordNotes
        record={{ kind: "job", id: job.id }}
        notes={[note]}
        canEdit={false}
      />,
    );
    expect(claudes.getByText("Claude")).toBeTruthy();
    for (const name of ["Edit", "Delete"]) {
      expect(claudes.getByRole("button", { name })).toHaveProperty(
        "disabled",
        true,
      );
    }
    expect(claudes.getByText("Only Hector")).toBeTruthy();
    claudes.unmount();

    signInAs("owner");
    const hectors = render(
      <RecordNotes
        record={{ kind: "job", id: job.id }}
        notes={[note]}
        canEdit
      />,
    );
    fireEvent.click(hectors.getByRole("button", { name: "Edit" }));
    fireEvent.change(hectors.getByLabelText("Note"), {
      target: { value: "Edited." },
    });
    fireEvent.click(hectors.getByRole("button", { name: "Save" }));
    await waitFor(async () =>
      expect((await notesOf(job.id))[0]?.body).toBe("Edited."),
    );
  });

  it("drop what was typed on Cancel, so the next edit opens on the note as it is", async () => {
    const job = await aJob(await aCompany());
    signInAs("owner");
    const note = dataOf(
      await addNote({ record: { kind: "job", id: job.id }, body: "Saved." }),
    );
    const view = render(
      <RecordNotes
        record={{ kind: "job", id: job.id }}
        notes={[note]}
        canEdit
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    fireEvent.change(view.getByLabelText("Note"), {
      target: { value: "Abandoned." },
    });
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    fireEvent.click(view.getByRole("button", { name: "Edit" }));

    expect(view.getByLabelText("Note")).toHaveProperty("value", "Saved.");
  });

  // R22, KTD15: an edit goes against the note the editor opened on, and a change made since keeps
  // what was typed, shows the note as it is now, and goes against it next.
  it("keep what was typed when the note changed since the edit began, and save it against the note as it is now", async () => {
    const job = await aJob(await aCompany());
    signInAs("owner");
    const note = dataOf(
      await addNote({ record: { kind: "job", id: job.id }, body: "Before." }),
    );
    const view = render(
      <RecordNotes
        record={{ kind: "job", id: job.id }}
        notes={[note]}
        canEdit
      />,
    );
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    dataOf(
      await editNote({
        id: note.id,
        updatedAt: note.updatedAt.toISOString(),
        body: "Changed in another tab.",
      }),
    );

    fireEvent.change(view.getByLabelText("Note"), {
      target: { value: "Mine." },
    });
    const form = view.getByLabelText("Note").closest("form");
    if (!form) throw new Error("No form");
    fireEvent.submit(form);

    await waitFor(() =>
      expect(view.getByText("Changed since you opened this")).toBeTruthy(),
    );
    expect(view.getByText("Note is now Changed in another tab.")).toBeTruthy();
    expect(view.getByLabelText("Note")).toHaveProperty("value", "Mine.");
    expect((await notesOf(job.id))[0]?.body).toBe("Changed in another tab.");

    fireEvent.submit(form);
    await waitFor(async () =>
      expect((await notesOf(job.id))[0]?.body).toBe("Mine."),
    );
  });
});
