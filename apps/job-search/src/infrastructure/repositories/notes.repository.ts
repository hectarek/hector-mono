import { and, desc, eq } from "drizzle-orm";
import { notes } from "@/db/schema";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ChangeActor } from "@/src/entities/models/activity.model";
import type { Note, NoteRecord } from "@/src/entities/models/note.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

export class NotesRepository
  extends BaseRepository
  implements INotesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "notes");
  }

  async add(
    ownerId: string,
    {
      record,
      author,
      body,
    }: { record: NoteRecord; author: ChangeActor; body: string },
    tx: ITransaction,
  ): Promise<Note> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(notes)
        .values({
          ownerId,
          recordKind: record.kind,
          recordId: record.id,
          author,
          body,
        })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("add returned no note");
      }
      return toNote(row);
    } catch (err) {
      this.handleError(err, "add", { ownerId, recordId: record.id });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Note | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(notes)
        .where(and(eq(notes.ownerId, ownerId), eq(notes.id, id)))
        .for("update");
      return row && toNote(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, noteId: id });
    }
  }

  async update(
    ownerId: string,
    id: string,
    body: string,
    tx: ITransaction,
  ): Promise<Note> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(notes)
        .set({
          body,
          updatedAt: nextUpdatedAt(notes.updatedAt),
        })
        .where(and(eq(notes.ownerId, ownerId), eq(notes.id, id)))
        .returning();
      if (!row) {
        throw new DatabaseOperationError("update found no note");
      }
      return toNote(row);
    } catch (err) {
      this.handleError(err, "update", { ownerId, noteId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(notes)
        .where(and(eq(notes.ownerId, ownerId), eq(notes.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, noteId: id });
    }
  }

  async list(
    ownerId: string,
    record: NoteRecord,
    tx?: ITransaction,
  ): Promise<Note[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.ownerId, ownerId),
            eq(notes.recordKind, record.kind),
            eq(notes.recordId, record.id),
          ),
        )
        .orderBy(desc(notes.createdAt), desc(notes.id));
      return rows.map(toNote);
    } catch (err) {
      this.handleError(err, "list", { ownerId, recordId: record.id });
    }
  }

  async deleteFor(
    ownerId: string,
    record: NoteRecord,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(notes)
        .where(
          and(
            eq(notes.ownerId, ownerId),
            eq(notes.recordKind, record.kind),
            eq(notes.recordId, record.id),
          ),
        );
    } catch (err) {
      this.handleError(err, "deleteFor", { ownerId, recordId: record.id });
    }
  }
}

function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    record: { kind: row.recordKind, id: row.recordId },
    author: row.author,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
