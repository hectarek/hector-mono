"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  actionLogger,
  changeContext,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Note, NoteRecord } from "@/src/entities/models/note.model";

// Notes on jobs (docs/build-plan.md U6). add_note calls the first once U4's gate passes; editing
// and deleting a note are Hector's alone (R21).

// `tool` is the page tool's name.
export async function addNote(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Note>> {
  let note: Note;
  try {
    note = await getInjection("IAddNoteController")(
      input,
      await changeContext(tool),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("addNote"),
      "Couldn't add the note. Try again.",
    );
  }
  refresh(note.record);
  return succeeded(note);
}

export async function editNote(input: unknown): Promise<ActionResult<Note>> {
  let note: Note;
  try {
    note = await getInjection("IEditNoteController")(
      input,
      await changeContext(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("editNote"),
      "Couldn't save the note. Try again.",
    );
  }
  refresh(note.record);
  return succeeded(note);
}

export async function deleteNote(
  input: unknown,
): Promise<ActionResult<{ id: string; record: NoteRecord }>> {
  let deleted: { id: string; record: NoteRecord };
  try {
    deleted = await getInjection("IDeleteNoteController")(
      input,
      await changeContext(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("deleteNote"),
      "Couldn't delete the note. Try again.",
    );
  }
  refresh(deleted.record);
  return succeeded(deleted);
}

// The page that lists the record's notes, and Claude's page, which lists its changes.
function refresh(record: NoteRecord): void {
  revalidatePath(`/jobs/${record.id}`);
  revalidatePath("/agent");
}
