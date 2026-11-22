import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  DEFAULT_NOTICES_OFF,
  NOTICE_GROUPS,
  type NoticeGroup,
} from "@/src/entities/notice-types";

export type IUpdateNoticeSettingsUseCase = ReturnType<
  typeof updateNoticeSettingsUseCase
>;

// One of Notices I get's switches (E7), saved as it flips: a group switched off hides its notices
// from the inbox and the bell, and they're still written. The tabs' counts don't change.
export const updateNoticeSettingsUseCase = (
  userSettingsRepository: IUserSettingsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateNoticeSettings",
  });

  return async (
    group: NoticeGroup,
    on: boolean,
    userId: string,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const settings = await userSettingsRepository.getByUserId(userId, tx);
      if (!settings) {
        throw new NotFoundError();
      }
      const off = new Set(settings.noticesOff ?? DEFAULT_NOTICES_OFF);
      if (on) {
        off.delete(group);
      } else {
        off.add(group);
      }
      await userSettingsRepository.update(
        userId,
        { noticesOff: NOTICE_GROUPS.filter((one) => off.has(one)) },
        tx,
      );
    });
    logger.debug("Saved", { userId, group, on });
  };
};
