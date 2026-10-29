import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  AllowedUserIds,
  IResolveActor,
} from "@/src/application/use-cases/access/resolve-actor";
import type { IListActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import type { IDeleteCompanyUseCase } from "@/src/application/use-cases/companies/delete-company.use-case";
import type { IFindCompaniesUseCase } from "@/src/application/use-cases/companies/find-companies.use-case";
import type { IGetCompanyUseCase } from "@/src/application/use-cases/companies/get-company.use-case";
import type { ISaveCompanyUseCase } from "@/src/application/use-cases/companies/save-company.use-case";
import type { IDeleteInteractionUseCase } from "@/src/application/use-cases/interactions/delete-interaction.use-case";
import type { ILogInteractionUseCase } from "@/src/application/use-cases/interactions/log-interaction.use-case";
import type { ICreateJobUseCase } from "@/src/application/use-cases/jobs/create-job.use-case";
import type { IDeleteJobUseCase } from "@/src/application/use-cases/jobs/delete-job.use-case";
import type { IFindJobsUseCase } from "@/src/application/use-cases/jobs/find-jobs.use-case";
import type { IGetJobUseCase } from "@/src/application/use-cases/jobs/get-job.use-case";
import type { IMoveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import type { IReviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import type { IUpdateJobUseCase } from "@/src/application/use-cases/jobs/update-job.use-case";
import type { IAddNoteUseCase } from "@/src/application/use-cases/notes/add-note.use-case";
import type { IDeleteNoteUseCase } from "@/src/application/use-cases/notes/delete-note.use-case";
import type { IEditNoteUseCase } from "@/src/application/use-cases/notes/edit-note.use-case";
import type { IAddPersonUseCase } from "@/src/application/use-cases/people/add-person.use-case";
import type { IDeletePersonUseCase } from "@/src/application/use-cases/people/delete-person.use-case";
import type { IFindPeopleUseCase } from "@/src/application/use-cases/people/find-people.use-case";
import type { IGetPersonUseCase } from "@/src/application/use-cases/people/get-person.use-case";
import type { IRemoveContactUseCase } from "@/src/application/use-cases/people/remove-contact.use-case";
import type { IUpdatePersonUseCase } from "@/src/application/use-cases/people/update-person.use-case";
import type { IDeletePracticeEntryUseCase } from "@/src/application/use-cases/practice/delete-practice-entry.use-case";
import type { IGetPracticeSessionUseCase } from "@/src/application/use-cases/practice/get-practice-session.use-case";
import type { IListPracticeUseCase } from "@/src/application/use-cases/practice/list-practice.use-case";
import type { ILogPracticeUseCase } from "@/src/application/use-cases/practice/log-practice.use-case";
import type { IStartSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import type { IWhoamiUseCase } from "@/src/application/use-cases/session/whoami.use-case";
import type { IGetSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import type { IUpdateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import type { IAddSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import type { IListSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import type { IGetTodayUseCase } from "@/src/application/use-cases/week/get-today.use-case";
import type { IListActivityController } from "@/src/interface-adapters/controllers/activity/list-activity.controller";
import type { IDeleteCompanyController } from "@/src/interface-adapters/controllers/companies/delete-company.controller";
import type { IFindCompaniesController } from "@/src/interface-adapters/controllers/companies/find-companies.controller";
import type { IGetCompanyController } from "@/src/interface-adapters/controllers/companies/get-company.controller";
import type { ISaveCompanyController } from "@/src/interface-adapters/controllers/companies/save-company.controller";
import type { IDeleteInteractionController } from "@/src/interface-adapters/controllers/interactions/delete-interaction.controller";
import type { ILogInteractionController } from "@/src/interface-adapters/controllers/interactions/log-interaction.controller";
import type { IAcceptProposalController } from "@/src/interface-adapters/controllers/jobs/accept-proposal.controller";
import type { IAddJobController } from "@/src/interface-adapters/controllers/jobs/add-job.controller";
import type { ICloseJobController } from "@/src/interface-adapters/controllers/jobs/close-job.controller";
import type { IDeleteJobController } from "@/src/interface-adapters/controllers/jobs/delete-job.controller";
import type { IDismissProposalController } from "@/src/interface-adapters/controllers/jobs/dismiss-proposal.controller";
import type { IFindJobsController } from "@/src/interface-adapters/controllers/jobs/find-jobs.controller";
import type { IGetJobController } from "@/src/interface-adapters/controllers/jobs/get-job.controller";
import type { IProposeJobController } from "@/src/interface-adapters/controllers/jobs/propose-job.controller";
import type { IReopenProposalController } from "@/src/interface-adapters/controllers/jobs/reopen-proposal.controller";
import type { ISetJobStatusController } from "@/src/interface-adapters/controllers/jobs/set-job-status.controller";
import type { IUpdateJobController } from "@/src/interface-adapters/controllers/jobs/update-job.controller";
import type { IAddNoteController } from "@/src/interface-adapters/controllers/notes/add-note.controller";
import type { IDeleteNoteController } from "@/src/interface-adapters/controllers/notes/delete-note.controller";
import type { IEditNoteController } from "@/src/interface-adapters/controllers/notes/edit-note.controller";
import type { IAddPersonController } from "@/src/interface-adapters/controllers/people/add-person.controller";
import type { IDeletePersonController } from "@/src/interface-adapters/controllers/people/delete-person.controller";
import type { IFindPeopleController } from "@/src/interface-adapters/controllers/people/find-people.controller";
import type { IGetPersonController } from "@/src/interface-adapters/controllers/people/get-person.controller";
import type { IRemoveContactController } from "@/src/interface-adapters/controllers/people/remove-contact.controller";
import type { IUpdatePersonController } from "@/src/interface-adapters/controllers/people/update-person.controller";
import type { IDeletePracticeEntryController } from "@/src/interface-adapters/controllers/practice/delete-practice-entry.controller";
import type { IGetPracticeSessionController } from "@/src/interface-adapters/controllers/practice/get-practice-session.controller";
import type { IListPracticeController } from "@/src/interface-adapters/controllers/practice/list-practice.controller";
import type { ILogPracticeController } from "@/src/interface-adapters/controllers/practice/log-practice.controller";
import type { IStartSessionController } from "@/src/interface-adapters/controllers/session/start-session.controller";
import type { IWhoamiController } from "@/src/interface-adapters/controllers/session/whoami.controller";
import type { IGetSettingsController } from "@/src/interface-adapters/controllers/settings/get-settings.controller";
import type { IUpdateSettingsController } from "@/src/interface-adapters/controllers/settings/update-settings.controller";
import type { IAddSourceController } from "@/src/interface-adapters/controllers/sources/add-source.controller";
import type { IListSourcesController } from "@/src/interface-adapters/controllers/sources/list-sources.controller";
import type { IGetTodayController } from "@/src/interface-adapters/controllers/week/get-today.controller";

export const DI_SYMBOLS = {
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ILoggerService: Symbol.for("ILoggerService"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  AllowedUserIds: Symbol.for("AllowedUserIds"),
  IResolveActor: Symbol.for("IResolveActor"),
  IActivityRepository: Symbol.for("IActivityRepository"),
  IListActivityUseCase: Symbol.for("IListActivityUseCase"),
  IListActivityController: Symbol.for("IListActivityController"),
  IWhoamiUseCase: Symbol.for("IWhoamiUseCase"),
  IWhoamiController: Symbol.for("IWhoamiController"),
  IStartSessionUseCase: Symbol.for("IStartSessionUseCase"),
  IStartSessionController: Symbol.for("IStartSessionController"),
  ICompaniesRepository: Symbol.for("ICompaniesRepository"),
  IFindCompaniesUseCase: Symbol.for("IFindCompaniesUseCase"),
  IFindCompaniesController: Symbol.for("IFindCompaniesController"),
  IGetCompanyUseCase: Symbol.for("IGetCompanyUseCase"),
  IGetCompanyController: Symbol.for("IGetCompanyController"),
  ISaveCompanyUseCase: Symbol.for("ISaveCompanyUseCase"),
  ISaveCompanyController: Symbol.for("ISaveCompanyController"),
  IDeleteCompanyUseCase: Symbol.for("IDeleteCompanyUseCase"),
  IDeleteCompanyController: Symbol.for("IDeleteCompanyController"),
  ILeadSourcesRepository: Symbol.for("ILeadSourcesRepository"),
  IAddSourceUseCase: Symbol.for("IAddSourceUseCase"),
  IAddSourceController: Symbol.for("IAddSourceController"),
  IListSourcesUseCase: Symbol.for("IListSourcesUseCase"),
  IListSourcesController: Symbol.for("IListSourcesController"),
  ISettingsRepository: Symbol.for("ISettingsRepository"),
  IGetSettingsUseCase: Symbol.for("IGetSettingsUseCase"),
  IGetSettingsController: Symbol.for("IGetSettingsController"),
  IUpdateSettingsUseCase: Symbol.for("IUpdateSettingsUseCase"),
  IUpdateSettingsController: Symbol.for("IUpdateSettingsController"),
  IJobsRepository: Symbol.for("IJobsRepository"),
  IFindJobsUseCase: Symbol.for("IFindJobsUseCase"),
  IFindJobsController: Symbol.for("IFindJobsController"),
  IGetJobUseCase: Symbol.for("IGetJobUseCase"),
  IGetJobController: Symbol.for("IGetJobController"),
  ICreateJobUseCase: Symbol.for("ICreateJobUseCase"),
  IProposeJobController: Symbol.for("IProposeJobController"),
  IAddJobController: Symbol.for("IAddJobController"),
  IUpdateJobUseCase: Symbol.for("IUpdateJobUseCase"),
  IUpdateJobController: Symbol.for("IUpdateJobController"),
  IMoveJobUseCase: Symbol.for("IMoveJobUseCase"),
  ISetJobStatusController: Symbol.for("ISetJobStatusController"),
  ICloseJobController: Symbol.for("ICloseJobController"),
  IReviewProposalUseCase: Symbol.for("IReviewProposalUseCase"),
  IAcceptProposalController: Symbol.for("IAcceptProposalController"),
  IDismissProposalController: Symbol.for("IDismissProposalController"),
  IReopenProposalController: Symbol.for("IReopenProposalController"),
  IDeleteJobUseCase: Symbol.for("IDeleteJobUseCase"),
  IDeleteJobController: Symbol.for("IDeleteJobController"),
  INotesRepository: Symbol.for("INotesRepository"),
  IAddNoteUseCase: Symbol.for("IAddNoteUseCase"),
  IAddNoteController: Symbol.for("IAddNoteController"),
  IEditNoteUseCase: Symbol.for("IEditNoteUseCase"),
  IEditNoteController: Symbol.for("IEditNoteController"),
  IDeleteNoteUseCase: Symbol.for("IDeleteNoteUseCase"),
  IDeleteNoteController: Symbol.for("IDeleteNoteController"),
  IPeopleRepository: Symbol.for("IPeopleRepository"),
  IInteractionsRepository: Symbol.for("IInteractionsRepository"),
  IFindPeopleUseCase: Symbol.for("IFindPeopleUseCase"),
  IFindPeopleController: Symbol.for("IFindPeopleController"),
  IGetPersonUseCase: Symbol.for("IGetPersonUseCase"),
  IGetPersonController: Symbol.for("IGetPersonController"),
  IAddPersonUseCase: Symbol.for("IAddPersonUseCase"),
  IAddPersonController: Symbol.for("IAddPersonController"),
  IUpdatePersonUseCase: Symbol.for("IUpdatePersonUseCase"),
  IUpdatePersonController: Symbol.for("IUpdatePersonController"),
  IDeletePersonUseCase: Symbol.for("IDeletePersonUseCase"),
  IDeletePersonController: Symbol.for("IDeletePersonController"),
  IRemoveContactUseCase: Symbol.for("IRemoveContactUseCase"),
  IRemoveContactController: Symbol.for("IRemoveContactController"),
  ILogInteractionUseCase: Symbol.for("ILogInteractionUseCase"),
  ILogInteractionController: Symbol.for("ILogInteractionController"),
  IDeleteInteractionUseCase: Symbol.for("IDeleteInteractionUseCase"),
  IDeleteInteractionController: Symbol.for("IDeleteInteractionController"),
  IPracticeRepository: Symbol.for("IPracticeRepository"),
  IListPracticeUseCase: Symbol.for("IListPracticeUseCase"),
  IListPracticeController: Symbol.for("IListPracticeController"),
  IGetPracticeSessionUseCase: Symbol.for("IGetPracticeSessionUseCase"),
  IGetPracticeSessionController: Symbol.for("IGetPracticeSessionController"),
  ILogPracticeUseCase: Symbol.for("ILogPracticeUseCase"),
  ILogPracticeController: Symbol.for("ILogPracticeController"),
  IDeletePracticeEntryUseCase: Symbol.for("IDeletePracticeEntryUseCase"),
  IDeletePracticeEntryController: Symbol.for("IDeletePracticeEntryController"),
  IGetTodayUseCase: Symbol.for("IGetTodayUseCase"),
  IGetTodayController: Symbol.for("IGetTodayController"),
};

export interface DI_RETURN_TYPES {
  IAuthenticationService: IAuthenticationService;
  ILoggerService: ILoggerService;
  ITransactionManagerService: ITransactionManagerService;
  AllowedUserIds: AllowedUserIds;
  IResolveActor: IResolveActor;
  IActivityRepository: IActivityRepository;
  IListActivityUseCase: IListActivityUseCase;
  IListActivityController: IListActivityController;
  IWhoamiUseCase: IWhoamiUseCase;
  IWhoamiController: IWhoamiController;
  IStartSessionUseCase: IStartSessionUseCase;
  IStartSessionController: IStartSessionController;
  ICompaniesRepository: ICompaniesRepository;
  IFindCompaniesUseCase: IFindCompaniesUseCase;
  IFindCompaniesController: IFindCompaniesController;
  IGetCompanyUseCase: IGetCompanyUseCase;
  IGetCompanyController: IGetCompanyController;
  ISaveCompanyUseCase: ISaveCompanyUseCase;
  ISaveCompanyController: ISaveCompanyController;
  IDeleteCompanyUseCase: IDeleteCompanyUseCase;
  IDeleteCompanyController: IDeleteCompanyController;
  ILeadSourcesRepository: ILeadSourcesRepository;
  IAddSourceUseCase: IAddSourceUseCase;
  IAddSourceController: IAddSourceController;
  IListSourcesUseCase: IListSourcesUseCase;
  IListSourcesController: IListSourcesController;
  ISettingsRepository: ISettingsRepository;
  IGetSettingsUseCase: IGetSettingsUseCase;
  IGetSettingsController: IGetSettingsController;
  IUpdateSettingsUseCase: IUpdateSettingsUseCase;
  IUpdateSettingsController: IUpdateSettingsController;
  IJobsRepository: IJobsRepository;
  IFindJobsUseCase: IFindJobsUseCase;
  IFindJobsController: IFindJobsController;
  IGetJobUseCase: IGetJobUseCase;
  IGetJobController: IGetJobController;
  ICreateJobUseCase: ICreateJobUseCase;
  IProposeJobController: IProposeJobController;
  IAddJobController: IAddJobController;
  IUpdateJobUseCase: IUpdateJobUseCase;
  IUpdateJobController: IUpdateJobController;
  IMoveJobUseCase: IMoveJobUseCase;
  ISetJobStatusController: ISetJobStatusController;
  ICloseJobController: ICloseJobController;
  IReviewProposalUseCase: IReviewProposalUseCase;
  IAcceptProposalController: IAcceptProposalController;
  IDismissProposalController: IDismissProposalController;
  IReopenProposalController: IReopenProposalController;
  IDeleteJobUseCase: IDeleteJobUseCase;
  IDeleteJobController: IDeleteJobController;
  INotesRepository: INotesRepository;
  IAddNoteUseCase: IAddNoteUseCase;
  IAddNoteController: IAddNoteController;
  IEditNoteUseCase: IEditNoteUseCase;
  IEditNoteController: IEditNoteController;
  IDeleteNoteUseCase: IDeleteNoteUseCase;
  IDeleteNoteController: IDeleteNoteController;
  IPeopleRepository: IPeopleRepository;
  IInteractionsRepository: IInteractionsRepository;
  IFindPeopleUseCase: IFindPeopleUseCase;
  IFindPeopleController: IFindPeopleController;
  IGetPersonUseCase: IGetPersonUseCase;
  IGetPersonController: IGetPersonController;
  IAddPersonUseCase: IAddPersonUseCase;
  IAddPersonController: IAddPersonController;
  IUpdatePersonUseCase: IUpdatePersonUseCase;
  IUpdatePersonController: IUpdatePersonController;
  IDeletePersonUseCase: IDeletePersonUseCase;
  IDeletePersonController: IDeletePersonController;
  IRemoveContactUseCase: IRemoveContactUseCase;
  IRemoveContactController: IRemoveContactController;
  ILogInteractionUseCase: ILogInteractionUseCase;
  ILogInteractionController: ILogInteractionController;
  IDeleteInteractionUseCase: IDeleteInteractionUseCase;
  IDeleteInteractionController: IDeleteInteractionController;
  IPracticeRepository: IPracticeRepository;
  IListPracticeUseCase: IListPracticeUseCase;
  IListPracticeController: IListPracticeController;
  IGetPracticeSessionUseCase: IGetPracticeSessionUseCase;
  IGetPracticeSessionController: IGetPracticeSessionController;
  ILogPracticeUseCase: ILogPracticeUseCase;
  ILogPracticeController: ILogPracticeController;
  IDeletePracticeEntryUseCase: IDeletePracticeEntryUseCase;
  IDeletePracticeEntryController: IDeletePracticeEntryController;
  IGetTodayUseCase: IGetTodayUseCase;
  IGetTodayController: IGetTodayController;
}
