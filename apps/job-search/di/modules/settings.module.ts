import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import { updateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import { SettingsRepository } from "@/src/infrastructure/repositories/settings.repository";
import { MockSettingsRepository } from "@/src/infrastructure/repositories/settings.repository.mock";
import { getSettingsController } from "@/src/interface-adapters/controllers/settings/get-settings.controller";
import { updateSettingsController } from "@/src/interface-adapters/controllers/settings/update-settings.controller";

// Hector's settings (docs/build-plan.md U5).
export function createSettingsModule() {
  const settingsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    settingsModule
      .bind(DI_SYMBOLS.ISettingsRepository)
      .toClass(MockSettingsRepository);
  } else {
    settingsModule
      .bind(DI_SYMBOLS.ISettingsRepository)
      .toClass(SettingsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  settingsModule
    .bind(DI_SYMBOLS.IGetSettingsUseCase)
    .toHigherOrderFunction(getSettingsUseCase, [
      DI_SYMBOLS.ISettingsRepository,
    ]);
  settingsModule
    .bind(DI_SYMBOLS.IGetSettingsController)
    .toHigherOrderFunction(getSettingsController, [
      DI_SYMBOLS.IGetSettingsUseCase,
    ]);

  settingsModule
    .bind(DI_SYMBOLS.IUpdateSettingsUseCase)
    .toHigherOrderFunction(updateSettingsUseCase, [
      DI_SYMBOLS.ISettingsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  settingsModule
    .bind(DI_SYMBOLS.IUpdateSettingsController)
    .toHigherOrderFunction(updateSettingsController, [
      DI_SYMBOLS.IUpdateSettingsUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return settingsModule;
}
