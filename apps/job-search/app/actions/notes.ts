"use server";

import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Note, NoteRecord } from "@/src/entities/models/note.model";

// Notes on jobs (docs/build-plan.md U6). add_note calls the first once U4's gate passes; editing
// and deleting a note are Hector's alone (R21).

// `tool` is the page tool's name.
export async function addNote(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Note>> {
  return answer(
    "addNote",
    "Couldn't add the note. Try again.",
    async () =>
      getInjection("IAddNoteController")(input, await changeContext(tool)),
    notePages,
  );
}

export async function editNote(input: unknown): Promise<ActionResult<Note>> {
  return answer(
    "editNote",
    "Couldn't save the note. Try again.",
    async () =>
      getInjection("IEditNoteController")(input, await changeContext()),
    notePages,
  );
}

export async function deleteNote(
  input: unknown,
): Promise<ActionResult<{ id: string; record: NoteRecord }>> {
  return answer(
    "deleteNote",
    "Couldn't delete the note. Try again.",
    async () =>
      getInjection("IDeleteNoteController")(input, await changeContext()),
    notePages,
  );
}

// The page that lists the record's notes, and Claude's page, which lists its changes.
function notePages({ record }: { record: NoteRecord }): string[] {
  return [`/jobs/${record.id}`, "/agent"];
}
