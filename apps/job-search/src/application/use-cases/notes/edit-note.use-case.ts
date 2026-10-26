import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { ConflictError, NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import type { EditNoteInput, Note } from "@/src/entities/models/note.model";

export type IEditNoteUseCase = ReturnType<typeof editNoteUseCase>;

// Edits a note's text, which only Hector may do: Claude's notes only append (R21), so its try is
// refused, and logged, before anything is read. Made against the updatedAt read (R22).
export const editNoteUseCase = (
  notesRepository: INotesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "editNote" });

  return async (
    context: ChangeContext,
    { id, updatedAt, body }: EditNoteInput,
  ): Promise<Note> => {
    const record: RecordRef = { kind: "note", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "edit-note",
    });
    const note = await transactionManager.startTransaction(async (tx) => {
      const current = await notesRepository.getForUpdate(
        context.ownerId,
        id,
        tx,
      );
      if (!current) {
        throw new NotFoundError("Couldn't find that note.");
      }
      if (current.updatedAt.getTime() !== updatedAt.getTime()) {
        throw new ConflictError(current);
      }
      if (current.body === body) {
        return current;
      }
      const edited = await notesRepository.update(
        context.ownerId,
        id,
        body,
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record,
        action: "updated",
        before: { body: current.body },
        after: { body },
      });
      return edited;
    });
    logger.info("Note edited", { noteId: id });
    return note;
  };
};
