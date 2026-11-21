import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { UserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository";
import { MockUserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository.mock";
import { UserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository";
import { MockUserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository.mock";

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

  return profileModule;
}
