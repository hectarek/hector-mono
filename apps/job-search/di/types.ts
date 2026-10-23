import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  AllowedUserIds,
  IResolveActor,
} from "@/src/application/use-cases/access/resolve-actor";

export const DI_SYMBOLS = {
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ILoggerService: Symbol.for("ILoggerService"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  AllowedUserIds: Symbol.for("AllowedUserIds"),
  IResolveActor: Symbol.for("IResolveActor"),
};

export interface DI_RETURN_TYPES {
  IAuthenticationService: IAuthenticationService;
  ILoggerService: ILoggerService;
  ITransactionManagerService: ITransactionManagerService;
  AllowedUserIds: AllowedUserIds;
  IResolveActor: IResolveActor;
}
