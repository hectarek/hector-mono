import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ChangeActor } from "@/src/entities/models/activity.model";
import type { Note, NoteRecord } from "@/src/entities/models/note.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// The notes in memory, listed newest first: by when each was added, then the order they came in,
// as the table's times put notes added one after another.
export class MockNotesRepository implements INotesRepository {
  private readonly rows: { ownerId: string; note: Note }[] = [];

  async add(
    ownerId: string,
    {
      record,
      author,
      body,
    }: { record: NoteRecord; author: ChangeActor; body: string },
  ): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: crypto.randomUUID(),
      record: { ...record },
      author,
      body,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push({ ownerId, note });
    return copyOf(note);
  }

  async getForUpdate(ownerId: string, id: string): Promise<Note | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && copyOf(row.note);
  }

  async update(ownerId: string, id: string, body: string): Promise<Note> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("update found no note");
    }
    row.note = {
      ...row.note,
      body,
      updatedAt: nextUpdatedAt(row.note.updatedAt),
    };
    return copyOf(row.note);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const index = this.rows.findIndex(
      (row) => row.ownerId === ownerId && row.note.id === id,
    );
    if (index >= 0) {
      this.rows.splice(index, 1);
    }
  }

  async list(ownerId: string, record: NoteRecord): Promise<Note[]> {
    return this.rows
      .map((row, added) => ({ ...row, added }))
      .filter((row) => row.ownerId === ownerId && isOn(row.note, record))
      .sort(
        (a, b) =>
          b.note.createdAt.getTime() - a.note.createdAt.getTime() ||
          b.added - a.added,
      )
      .map(({ note }) => copyOf(note));
  }

  async deleteFor(ownerId: string, record: NoteRecord): Promise<void> {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      const row = this.rows[index];
      if (row && row.ownerId === ownerId && isOn(row.note, record)) {
        this.rows.splice(index, 1);
      }
    }
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.note.id === id,
    );
  }
}

function isOn(note: Note, record: NoteRecord): boolean {
  return note.record.kind === record.kind && note.record.id === record.id;
}

function copyOf(note: Note): Note {
  return { ...note, record: { ...note.record } };
}
