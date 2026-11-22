import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { createProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import { getAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import { getNoticeSettingsUseCase } from "@/src/application/use-cases/profile/get-notice-settings.use-case";
import { getProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import { listTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import { removePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import { setPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import { updateNoticeSettingsUseCase } from "@/src/application/use-cases/profile/update-notice-settings.use-case";
import { updateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import { UserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository";
import { MockUserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository.mock";
import { UserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository";
import { MockUserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository.mock";
import { createProfileController } from "@/src/interface-adapters/controllers/profile/create-profile.controller";
import { getAccountStateController } from "@/src/interface-adapters/controllers/profile/get-account-state.controller";
import { getNoticeSettingsController } from "@/src/interface-adapters/controllers/profile/get-notice-settings.controller";
import { getProfileController } from "@/src/interface-adapters/controllers/profile/get-profile.controller";
import { listTakenPiecesController } from "@/src/interface-adapters/controllers/profile/list-taken-pieces.controller";
import { removePhotoController } from "@/src/interface-adapters/controllers/profile/remove-photo.controller";
import { setPhotoController } from "@/src/interface-adapters/controllers/profile/set-photo.controller";
import { updateNoticeSettingsController } from "@/src/interface-adapters/controllers/profile/update-notice-settings.controller";
import { updateProfileController } from "@/src/interface-adapters/controllers/profile/update-profile.controller";

export function createProfileModule() {
  const profileModule = createModule();

  if (process.env.NODE_ENV === "test") {
    profileModule
      .bind(DI_SYMBOLS.IUserProfilesRepository)
      .toClass(MockUserProfilesRepository);
    profileModule
      .bind(DI_SYMBOLS.IUserSettingsRepository)
      .toClass(MockUserSettingsRepository);
  } else {
    profileModule
      .bind(DI_SYMBOLS.IUserProfilesRepository)
      .toClass(UserProfilesRepository, [DI_SYMBOLS.ILoggerService]);
    profileModule
      .bind(DI_SYMBOLS.IUserSettingsRepository)
      .toClass(UserSettingsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  profileModule
    .bind(DI_SYMBOLS.ICreateProfileUseCase)
    .toHigherOrderFunction(createProfileUseCase, [
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IUserSettingsRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IGetAccountStateUseCase)
    .toHigherOrderFunction(getAccountStateUseCase, [
      DI_SYMBOLS.IRemovedUsersRepository,
      DI_SYMBOLS.IUserProfilesRepository,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IGetProfileUseCase)
    .toHigherOrderFunction(getProfileUseCase, [
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IFriendshipsRepository,
      DI_SYMBOLS.IFileStorage,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IListTakenPiecesUseCase)
    .toHigherOrderFunction(listTakenPiecesUseCase, [
      DI_SYMBOLS.IFriendshipsRepository,
      DI_SYMBOLS.IUserProfilesRepository,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IRemovePhotoUseCase)
    .toHigherOrderFunction(removePhotoUseCase, [
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IFileStorage,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  profileModule
    .bind(DI_SYMBOLS.ISetPhotoUseCase)
    .toHigherOrderFunction(setPhotoUseCase, [
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IFileStorage,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IUpdateProfileUseCase)
    .toHigherOrderFunction(updateProfileUseCase, [
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  const withUseCase = (useCase: symbol) => [useCase, DI_SYMBOLS.ILoggerService];
  profileModule
    .bind(DI_SYMBOLS.ICreateProfileController)
    .toHigherOrderFunction(
      createProfileController,
      withUseCase(DI_SYMBOLS.ICreateProfileUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IGetAccountStateController)
    .toHigherOrderFunction(
      getAccountStateController,
      withUseCase(DI_SYMBOLS.IGetAccountStateUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IGetProfileController)
    .toHigherOrderFunction(
      getProfileController,
      withUseCase(DI_SYMBOLS.IGetProfileUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IListTakenPiecesController)
    .toHigherOrderFunction(
      listTakenPiecesController,
      withUseCase(DI_SYMBOLS.IListTakenPiecesUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IRemovePhotoController)
    .toHigherOrderFunction(
      removePhotoController,
      withUseCase(DI_SYMBOLS.IRemovePhotoUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.ISetPhotoController)
    .toHigherOrderFunction(
      setPhotoController,
      withUseCase(DI_SYMBOLS.ISetPhotoUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IGetNoticeSettingsUseCase)
    .toHigherOrderFunction(getNoticeSettingsUseCase, [
      DI_SYMBOLS.IUserSettingsRepository,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IGetNoticeSettingsController)
    .toHigherOrderFunction(
      getNoticeSettingsController,
      withUseCase(DI_SYMBOLS.IGetNoticeSettingsUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IUpdateNoticeSettingsUseCase)
    .toHigherOrderFunction(updateNoticeSettingsUseCase, [
      DI_SYMBOLS.IUserSettingsRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  profileModule
    .bind(DI_SYMBOLS.IUpdateNoticeSettingsController)
    .toHigherOrderFunction(
      updateNoticeSettingsController,
      withUseCase(DI_SYMBOLS.IUpdateNoticeSettingsUseCase),
    );
  profileModule
    .bind(DI_SYMBOLS.IUpdateProfileController)
    .toHigherOrderFunction(
      updateProfileController,
      withUseCase(DI_SYMBOLS.IUpdateProfileUseCase),
    );

  return profileModule;
}
