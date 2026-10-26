import { z } from "zod";
import type { ChangeActor } from "./activity.model";
import { requiredText, timeSchema } from "./input.model";

// What notes can be about: jobs for now; people come with U7.
const noteRecordSchema = z.object({ kind: z.enum(["job"]), id: z.uuid() });
export type NoteRecord = z.infer<typeof noteRecordSchema>;

// A dated note on a record (R1, R21). Claude only adds notes; Hector also edits and deletes them.
export type Note = {
  id: string;
  record: NoteRecord;
  author: ChangeActor;
  body: string;
  createdAt: Date;
  // When it last changed: an edit sends back the one it read (R22).
  updatedAt: Date;
};

const bodySchema = requiredText(4000, "A note needs some text");

// add_note's input: which record, and the note.
export const addNoteSchema = z.object({
  record: noteRecordSchema,
  body: bodySchema,
});
export type AddNoteInput = z.output<typeof addNoteSchema>;

// An edit of a note, against the updatedAt read with it.
export const editNoteSchema = z.object({
  id: z.uuid(),
  updatedAt: timeSchema,
  body: bodySchema,
});
export type EditNoteInput = z.output<typeof editNoteSchema>;

// Which note: deleting one's input.
export const noteIdSchema = z.object({ id: z.uuid() });
