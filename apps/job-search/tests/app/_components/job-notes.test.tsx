import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { JobNotes } from "@/app/_components/job-notes";
import { getJob } from "@/app/actions/jobs";
import { addNote } from "@/app/actions/notes";
import { aCompany, aJob, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const notesOf = async (id: string) => dataOf(await getJob({ id })).notes;

describe("a job's notes", () => {
  it("add a note, signed by whoever added it", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    const view = render(<JobNotes jobId={job.id} notes={[]} canEdit={false} />);

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

  it("let Hector edit a note in place, and show Claude's session no edit", async () => {
    const job = await aJob(await aCompany());
    signInAs("agent");
    const note = dataOf(
      await addNote({ record: { kind: "job", id: job.id }, body: "A draft." }),
    );

    const claudes = render(
      <JobNotes jobId={job.id} notes={[note]} canEdit={false} />,
    );
    expect(claudes.getByText("Claude")).toBeTruthy();
    expect(claudes.queryByRole("button", { name: "Edit" })).toBeNull();
    claudes.unmount();

    signInAs("owner");
    const hectors = render(<JobNotes jobId={job.id} notes={[note]} canEdit />);
    fireEvent.click(hectors.getByRole("button", { name: "Edit" }));
    fireEvent.change(hectors.getByLabelText("Note"), {
      target: { value: "Edited." },
    });
    fireEvent.click(hectors.getByRole("button", { name: "Save" }));
    await waitFor(async () =>
      expect((await notesOf(job.id))[0]?.body).toBe("Edited."),
    );
  });
});
