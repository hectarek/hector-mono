import type { ChangeActor } from "@/src/entities/models/activity.model";
import type { Note, NoteRecord } from "@/src/entities/models/note.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An owner's notes on records (docs/build-plan.md U6). Every method takes the owner's id (KTD2).
export interface INotesRepository {
  add(
    ownerId: string,
    note: { record: NoteRecord; author: ChangeActor; body: string },
    tx: ITransaction,
  ): Promise<Note>;
  // The note, read for a change: it stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Note | undefined>;
  // Sets the text and moves updatedAt on.
  update(
    ownerId: string,
    id: string,
    body: string,
    tx: ITransaction,
  ): Promise<Note>;
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // A record's notes, newest first.
  list(ownerId: string, record: NoteRecord, tx?: ITransaction): Promise<Note[]>;
  // Every note on a record, with the record's own delete.
  deleteFor(
    ownerId: string,
    record: NoteRecord,
    tx: ITransaction,
  ): Promise<void>;
}
