import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
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
import type { IStartSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import type { IWhoamiUseCase } from "@/src/application/use-cases/session/whoami.use-case";
import type { IGetSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import type { IUpdateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import type { IAddSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import type { IListSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import type { IListActivityController } from "@/src/interface-adapters/controllers/activity/list-activity.controller";
import type { IDeleteCompanyController } from "@/src/interface-adapters/controllers/companies/delete-company.controller";
import type { IFindCompaniesController } from "@/src/interface-adapters/controllers/companies/find-companies.controller";
import type { IGetCompanyController } from "@/src/interface-adapters/controllers/companies/get-company.controller";
import type { ISaveCompanyController } from "@/src/interface-adapters/controllers/companies/save-company.controller";
import type { IStartSessionController } from "@/src/interface-adapters/controllers/session/start-session.controller";
import type { IWhoamiController } from "@/src/interface-adapters/controllers/session/whoami.controller";
import type { IGetSettingsController } from "@/src/interface-adapters/controllers/settings/get-settings.controller";
import type { IUpdateSettingsController } from "@/src/interface-adapters/controllers/settings/update-settings.controller";
import type { IAddSourceController } from "@/src/interface-adapters/controllers/sources/add-source.controller";
import type { IListSourcesController } from "@/src/interface-adapters/controllers/sources/list-sources.controller";

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
}
