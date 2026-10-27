import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import {
  DEFAULT_SETTINGS,
  type Settings,
} from "@/src/entities/models/settings.model";

export type IGetSettingsUseCase = ReturnType<typeof getSettingsUseCase>;

// The owner's settings (R12), or the defaults before the first save.
export const getSettingsUseCase =
  (settingsRepository: ISettingsRepository) =>
  async (ownerId: string): Promise<Settings> =>
    (await settingsRepository.get(ownerId)) ?? DEFAULT_SETTINGS;
