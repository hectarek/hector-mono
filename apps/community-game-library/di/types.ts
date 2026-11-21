import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
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
  IFriendshipsRepository: Symbol.for("IFriendshipsRepository"),
  ILoansRepository: Symbol.for("ILoansRepository"),
  ILoggerService: Symbol.for("ILoggerService"),
  INoticesRepository: Symbol.for("INoticesRepository"),
  IRemovedUsersRepository: Symbol.for("IRemovedUsersRepository"),
  IRequireAdmin: Symbol.for("IRequireAdmin"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  IUserProfilesRepository: Symbol.for("IUserProfilesRepository"),
  IUserSettingsRepository: Symbol.for("IUserSettingsRepository"),
};

export interface DI_RETURN_TYPES {
  AdminAccount: AdminAccount;
  IAuthenticationService: IAuthenticationService;
  IFileStorage: IFileStorage;
  IFriendshipsRepository: IFriendshipsRepository;
  ILoansRepository: ILoansRepository;
  ILoggerService: ILoggerService;
  INoticesRepository: INoticesRepository;
  IRemovedUsersRepository: IRemovedUsersRepository;
  IRequireAdmin: IRequireAdmin;
  ITransactionManagerService: ITransactionManagerService;
  IUserProfilesRepository: IUserProfilesRepository;
  IUserSettingsRepository: IUserSettingsRepository;
}
