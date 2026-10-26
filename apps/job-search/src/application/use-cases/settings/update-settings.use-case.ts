import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { ConflictError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsValues,
  type UpdateSettingsInput,
} from "@/src/entities/models/settings.model";

export type IUpdateSettingsUseCase = ReturnType<typeof updateSettingsUseCase>;

// Saves Hector's settings (R12), which only he may change (R21): Claude's try is refused, and
// logged, before anything is read. A save is made only against the updatedAt the form read
// (R22). The settings are one record whose id is the owner's, and their history logs each
// value that changed.
export const updateSettingsUseCase = (
  settingsRepository: ISettingsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateSettings",
  });

  return async (
    context: ChangeContext,
    { updatedAt, ...values }: UpdateSettingsInput,
  ): Promise<Settings> => {
    const record: RecordRef = { kind: "settings", id: context.ownerId };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "change-settings",
    });
    const saved = await transactionManager.startTransaction(async (tx) => {
      const current = await settingsRepository.getForUpdate(
        context.ownerId,
        tx,
      );
      if (current?.updatedAt?.getTime() !== updatedAt?.getTime()) {
        throw new ConflictError(current ?? DEFAULT_SETTINGS);
      }
      const before = asLogged(current ?? DEFAULT_SETTINGS);
      const after = asLogged(values);
      // Nothing changed: nothing to save or log.
      if (
        Object.entries(after).every(([key, value]) => before[key] === value)
      ) {
        return current ?? DEFAULT_SETTINGS;
      }
      const settings = current
        ? await settingsRepository.update(context.ownerId, values, tx)
        : await settingsRepository.create(context.ownerId, values, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "updated",
        before,
        after,
      });
      return settings;
    });
    logger.info("Settings saved");
    return saved;
  };
};

// Settings as their history names them: each target by its count, then the cap.
function asLogged({
  targets,
  pendingCap,
}: SettingsValues): Record<string, number | null> {
  return { ...targets, pendingCap };
}
