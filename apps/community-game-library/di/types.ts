import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  AdminAccount,
  IRequireAdmin,
} from "@/src/application/use-cases/admin/require-admin";

// Each list keeps its lines in alphabetical order, so two batches adding to it merge cleanly
// (docs/build-plan.md, Code map).
export const DI_SYMBOLS = {
  AdminAccount: Symbol.for("AdminAccount"),
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  IFileStorage: Symbol.for("IFileStorage"),
  ILoggerService: Symbol.for("ILoggerService"),
  IRequireAdmin: Symbol.for("IRequireAdmin"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
};

export interface DI_RETURN_TYPES {
  AdminAccount: AdminAccount;
  IAuthenticationService: IAuthenticationService;
  IFileStorage: IFileStorage;
  ILoggerService: ILoggerService;
  IRequireAdmin: IRequireAdmin;
  ITransactionManagerService: ITransactionManagerService;
}
