import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type AddNoteInput,
  type Note,
  noteOn,
} from "@/src/entities/models/note.model";

export type IAddNoteUseCase = ReturnType<typeof addNoteUseCase>;

// Adds a dated note to a job or a person (add_note, R1; a person's since the UX plan's UX8):
// Hector's or Claude's, whose notes only ever append (R21). The note is a record of its own in the
// log, whose change names its job or person, so a session's start can place it. The record stays
// locked until the note is in, so its delete either takes the note with it or comes first and
// leaves nothing to add to.
export const addNoteUseCase = (
  notesRepository: INotesRepository,
  jobsRepository: IJobsRepository,
  peopleRepository: IPeopleRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addNote" });

  return async (
    context: ChangeContext,
    { record, body }: AddNoteInput,
  ): Promise<Note> => {
    const { ownerId } = context;
    const note = await transactionManager.startTransaction(async (tx) => {
      const found =
        record.kind === "job"
          ? await jobsRepository.getForUpdate(ownerId, record.id, tx)
          : await peopleRepository.getForUpdate(ownerId, record.id, tx);
      if (!found) {
        throw new NotFoundError(
          record.kind === "job"
            ? "Couldn't find that job."
            : "Couldn't find that person.",
        );
      }
      const added = await notesRepository.add(
        ownerId,
        { record, author: context.actor, body },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "note", id: added.id },
        action: "created",
        after: { body, ...noteOn(record) },
      });
      return added;
    });
    logger.info("Note added", { noteId: note.id, recordId: record.id });
    return note;
  };
};
