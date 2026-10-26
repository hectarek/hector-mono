import type { IGetSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { Settings } from "@/src/entities/models/settings.model";

export type IGetSettingsController = ReturnType<typeof getSettingsController>;

// The settings page's read. It takes no input.
export const getSettingsController =
  (useCase: IGetSettingsUseCase) =>
  ({ ownerId }: CurrentActor): Promise<Settings> =>
    useCase(ownerId);
