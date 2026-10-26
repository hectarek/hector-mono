import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addNoteUseCase } from "@/src/application/use-cases/notes/add-note.use-case";
import { deleteNoteUseCase } from "@/src/application/use-cases/notes/delete-note.use-case";
import { editNoteUseCase } from "@/src/application/use-cases/notes/edit-note.use-case";
import { NotesRepository } from "@/src/infrastructure/repositories/notes.repository";
import { MockNotesRepository } from "@/src/infrastructure/repositories/notes.repository.mock";
import { addNoteController } from "@/src/interface-adapters/controllers/notes/add-note.controller";
import { deleteNoteController } from "@/src/interface-adapters/controllers/notes/delete-note.controller";
import { editNoteController } from "@/src/interface-adapters/controllers/notes/edit-note.controller";

// Notes on jobs (docs/build-plan.md U6).
export function createNotesModule() {
  const notesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    notesModule.bind(DI_SYMBOLS.INotesRepository).toClass(MockNotesRepository);
  } else {
    notesModule
      .bind(DI_SYMBOLS.INotesRepository)
      .toClass(NotesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  notesModule
    .bind(DI_SYMBOLS.IAddNoteUseCase)
    .toHigherOrderFunction(addNoteUseCase, [
      DI_SYMBOLS.INotesRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  notesModule
    .bind(DI_SYMBOLS.IEditNoteUseCase)
    .toHigherOrderFunction(editNoteUseCase, [
      DI_SYMBOLS.INotesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  notesModule
    .bind(DI_SYMBOLS.IDeleteNoteUseCase)
    .toHigherOrderFunction(deleteNoteUseCase, [
      DI_SYMBOLS.INotesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  notesModule
    .bind(DI_SYMBOLS.IAddNoteController)
    .toHigherOrderFunction(addNoteController, [
      DI_SYMBOLS.IAddNoteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  notesModule
    .bind(DI_SYMBOLS.IEditNoteController)
    .toHigherOrderFunction(editNoteController, [
      DI_SYMBOLS.IEditNoteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  notesModule
    .bind(DI_SYMBOLS.IDeleteNoteController)
    .toHigherOrderFunction(deleteNoteController, [
      DI_SYMBOLS.IDeleteNoteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return notesModule;
}
