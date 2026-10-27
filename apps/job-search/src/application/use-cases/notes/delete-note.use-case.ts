import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import type { NoteRecord } from "@/src/entities/models/note.model";

export type IDeleteNoteUseCase = ReturnType<typeof deleteNoteUseCase>;

// Deletes a note, which only Hector may do (R21): Claude's try is refused, and logged, before
// anything is read. The history keeps its text. It answers with the note's record, whose page
// listed it.
export const deleteNoteUseCase = (
  notesRepository: INotesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "deleteNote" });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<{ id: string; record: NoteRecord }> => {
    const record: RecordRef = { kind: "note", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const note = await notesRepository.getForUpdate(context.ownerId, id, tx);
      if (!note) {
        throw new NotFoundError("Couldn't find that note.");
      }
      await notesRepository.delete(context.ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: { body: note.body },
      });
      return { id, record: note.record };
    });
    logger.info("Note deleted", { noteId: id });
    return deleted;
  };
};
