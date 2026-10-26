import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { AddNoteInput, Note } from "@/src/entities/models/note.model";

export type IAddNoteUseCase = ReturnType<typeof addNoteUseCase>;

// Adds a dated note to a job (add_note, R1): Hector's or Claude's, whose notes only ever append
// (R21). The note is a record of its own in the log.
export const addNoteUseCase = (
  notesRepository: INotesRepository,
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addNote" });

  return async (
    context: ChangeContext,
    { record, body }: AddNoteInput,
  ): Promise<Note> => {
    const note = await transactionManager.startTransaction(async (tx) => {
      if (!(await jobsRepository.get(context.ownerId, record.id, tx))) {
        throw new NotFoundError("Couldn't find that job.");
      }
      const added = await notesRepository.add(
        context.ownerId,
        { record, author: context.actor, body },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "note", id: added.id },
        action: "created",
        after: { body },
      });
      return added;
    });
    logger.info("Note added", { noteId: note.id, recordId: record.id });
    return note;
  };
};
