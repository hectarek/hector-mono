import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  AllowedUserIds,
  IResolveActor,
} from "@/src/application/use-cases/access/resolve-actor";
import type { IListActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import type { IStartSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import type { IWhoamiUseCase } from "@/src/application/use-cases/session/whoami.use-case";
import type { IListActivityController } from "@/src/interface-adapters/controllers/activity/list-activity.controller";
import type { IStartSessionController } from "@/src/interface-adapters/controllers/session/start-session.controller";
import type { IWhoamiController } from "@/src/interface-adapters/controllers/session/whoami.controller";

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
}
