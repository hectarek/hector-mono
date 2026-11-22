import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
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
import type { IGetGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import type { ISearchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import type { IAddUserGameUseCase } from "@/src/application/use-cases/copies/add-user-game.use-case";
import type { IGetUserGameUseCase } from "@/src/application/use-cases/copies/get-user-game.use-case";
import type { IListMyLibraryUseCase } from "@/src/application/use-cases/copies/list-my-library.use-case";
import type { IPutInBoxUseCase } from "@/src/application/use-cases/copies/put-in-box.use-case";
import type { IRemoveUserGameUseCase } from "@/src/application/use-cases/copies/remove-user-game.use-case";
import type { ISetLendingUseCase } from "@/src/application/use-cases/copies/set-lending.use-case";
import type { ISetPassAlongForAllUseCase } from "@/src/application/use-cases/copies/set-pass-along-for-all.use-case";
import type { IUpdateUserGameUseCase } from "@/src/application/use-cases/copies/update-user-game.use-case";
import type { ICreateProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import type { IGetAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import type { IGetProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import type { IListTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import type { IRemovePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import type { ISetPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import type { IUpdateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import type { IGetGameController } from "@/src/interface-adapters/controllers/catalog/get-game.controller";
import type { ISearchGamesController } from "@/src/interface-adapters/controllers/catalog/search-games.controller";
import type { IAddUserGameController } from "@/src/interface-adapters/controllers/copies/add-user-game.controller";
import type { IGetUserGameController } from "@/src/interface-adapters/controllers/copies/get-user-game.controller";
import type { IListMyLibraryController } from "@/src/interface-adapters/controllers/copies/list-my-library.controller";
import type { IPutInBoxController } from "@/src/interface-adapters/controllers/copies/put-in-box.controller";
import type { IRemoveUserGameController } from "@/src/interface-adapters/controllers/copies/remove-user-game.controller";
import type { ISetLendingController } from "@/src/interface-adapters/controllers/copies/set-lending.controller";
import type { ISetPassAlongForAllController } from "@/src/interface-adapters/controllers/copies/set-pass-along-for-all.controller";
import type { IUpdateUserGameController } from "@/src/interface-adapters/controllers/copies/update-user-game.controller";
import type { ICreateProfileController } from "@/src/interface-adapters/controllers/profile/create-profile.controller";
import type { IGetAccountStateController } from "@/src/interface-adapters/controllers/profile/get-account-state.controller";
import type { IGetProfileController } from "@/src/interface-adapters/controllers/profile/get-profile.controller";
import type { IListTakenPiecesController } from "@/src/interface-adapters/controllers/profile/list-taken-pieces.controller";
import type { IRemovePhotoController } from "@/src/interface-adapters/controllers/profile/remove-photo.controller";
import type { ISetPhotoController } from "@/src/interface-adapters/controllers/profile/set-photo.controller";
import type { IUpdateProfileController } from "@/src/interface-adapters/controllers/profile/update-profile.controller";

// Each list keeps its lines in alphabetical order, so two batches adding to it merge cleanly
// (docs/build-plan.md, Code map).
export const DI_SYMBOLS = {
  AdminAccount: Symbol.for("AdminAccount"),
  IAddUserGameController: Symbol.for("IAddUserGameController"),
  IAddUserGameUseCase: Symbol.for("IAddUserGameUseCase"),
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ICreateProfileController: Symbol.for("ICreateProfileController"),
  ICreateProfileUseCase: Symbol.for("ICreateProfileUseCase"),
  IFileStorage: Symbol.for("IFileStorage"),
  IFriendshipsRepository: Symbol.for("IFriendshipsRepository"),
  IGamesRepository: Symbol.for("IGamesRepository"),
  IGetAccountStateController: Symbol.for("IGetAccountStateController"),
  IGetAccountStateUseCase: Symbol.for("IGetAccountStateUseCase"),
  IGetGameController: Symbol.for("IGetGameController"),
  IGetGameUseCase: Symbol.for("IGetGameUseCase"),
  IGetProfileController: Symbol.for("IGetProfileController"),
  IGetProfileUseCase: Symbol.for("IGetProfileUseCase"),
  IGetUserGameController: Symbol.for("IGetUserGameController"),
  IGetUserGameUseCase: Symbol.for("IGetUserGameUseCase"),
  IListMyLibraryController: Symbol.for("IListMyLibraryController"),
  IListMyLibraryUseCase: Symbol.for("IListMyLibraryUseCase"),
  IListTakenPiecesController: Symbol.for("IListTakenPiecesController"),
  IListTakenPiecesUseCase: Symbol.for("IListTakenPiecesUseCase"),
  ILoansRepository: Symbol.for("ILoansRepository"),
  ILoggerService: Symbol.for("ILoggerService"),
  INoticesRepository: Symbol.for("INoticesRepository"),
  IPutInBoxController: Symbol.for("IPutInBoxController"),
  IPutInBoxUseCase: Symbol.for("IPutInBoxUseCase"),
  IRemovePhotoController: Symbol.for("IRemovePhotoController"),
  IRemovePhotoUseCase: Symbol.for("IRemovePhotoUseCase"),
  IRemoveUserGameController: Symbol.for("IRemoveUserGameController"),
  IRemoveUserGameUseCase: Symbol.for("IRemoveUserGameUseCase"),
  IRemovedUsersRepository: Symbol.for("IRemovedUsersRepository"),
  IRequireAdmin: Symbol.for("IRequireAdmin"),
  ISearchGamesController: Symbol.for("ISearchGamesController"),
  ISearchGamesUseCase: Symbol.for("ISearchGamesUseCase"),
  ISetLendingController: Symbol.for("ISetLendingController"),
  ISetLendingUseCase: Symbol.for("ISetLendingUseCase"),
  ISetPassAlongForAllController: Symbol.for("ISetPassAlongForAllController"),
  ISetPassAlongForAllUseCase: Symbol.for("ISetPassAlongForAllUseCase"),
  ISetPhotoController: Symbol.for("ISetPhotoController"),
  ISetPhotoUseCase: Symbol.for("ISetPhotoUseCase"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  IUpdateProfileController: Symbol.for("IUpdateProfileController"),
  IUpdateProfileUseCase: Symbol.for("IUpdateProfileUseCase"),
  IUpdateUserGameController: Symbol.for("IUpdateUserGameController"),
  IUpdateUserGameUseCase: Symbol.for("IUpdateUserGameUseCase"),
  IUserGamesRepository: Symbol.for("IUserGamesRepository"),
  IUserProfilesRepository: Symbol.for("IUserProfilesRepository"),
  IUserSettingsRepository: Symbol.for("IUserSettingsRepository"),
};

export interface DI_RETURN_TYPES {
  AdminAccount: AdminAccount;
  IAddUserGameController: IAddUserGameController;
  IAddUserGameUseCase: IAddUserGameUseCase;
  IAuthenticationService: IAuthenticationService;
  ICreateProfileController: ICreateProfileController;
  ICreateProfileUseCase: ICreateProfileUseCase;
  IFileStorage: IFileStorage;
  IFriendshipsRepository: IFriendshipsRepository;
  IGamesRepository: IGamesRepository;
  IGetAccountStateController: IGetAccountStateController;
  IGetAccountStateUseCase: IGetAccountStateUseCase;
  IGetGameController: IGetGameController;
  IGetGameUseCase: IGetGameUseCase;
  IGetProfileController: IGetProfileController;
  IGetProfileUseCase: IGetProfileUseCase;
  IGetUserGameController: IGetUserGameController;
  IGetUserGameUseCase: IGetUserGameUseCase;
  IListMyLibraryController: IListMyLibraryController;
  IListMyLibraryUseCase: IListMyLibraryUseCase;
  IListTakenPiecesController: IListTakenPiecesController;
  IListTakenPiecesUseCase: IListTakenPiecesUseCase;
  ILoansRepository: ILoansRepository;
  ILoggerService: ILoggerService;
  INoticesRepository: INoticesRepository;
  IPutInBoxController: IPutInBoxController;
  IPutInBoxUseCase: IPutInBoxUseCase;
  IRemovePhotoController: IRemovePhotoController;
  IRemovePhotoUseCase: IRemovePhotoUseCase;
  IRemoveUserGameController: IRemoveUserGameController;
  IRemoveUserGameUseCase: IRemoveUserGameUseCase;
  IRemovedUsersRepository: IRemovedUsersRepository;
  IRequireAdmin: IRequireAdmin;
  ISearchGamesController: ISearchGamesController;
  ISearchGamesUseCase: ISearchGamesUseCase;
  ISetLendingController: ISetLendingController;
  ISetLendingUseCase: ISetLendingUseCase;
  ISetPassAlongForAllController: ISetPassAlongForAllController;
  ISetPassAlongForAllUseCase: ISetPassAlongForAllUseCase;
  ISetPhotoController: ISetPhotoController;
  ISetPhotoUseCase: ISetPhotoUseCase;
  ITransactionManagerService: ITransactionManagerService;
  IUpdateProfileController: IUpdateProfileController;
  IUpdateProfileUseCase: IUpdateProfileUseCase;
  IUpdateUserGameController: IUpdateUserGameController;
  IUpdateUserGameUseCase: IUpdateUserGameUseCase;
  IUserGamesRepository: IUserGamesRepository;
  IUserProfilesRepository: IUserProfilesRepository;
  IUserSettingsRepository: IUserSettingsRepository;
}
