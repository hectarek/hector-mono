import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import {
  DEFAULT_NOTICES_OFF,
  type NoticeGroup,
} from "@/src/entities/notice-types";

export type IGetNoticeSettingsUseCase = ReturnType<
  typeof getNoticeSettingsUseCase
>;

// Notices I get (E7): the groups the member has switched off.
export const getNoticeSettingsUseCase = (
  userSettingsRepository: IUserSettingsRepository,
) => {
  return async (userId: string): Promise<NoticeGroup[]> => [
    ...((await userSettingsRepository.getByUserId(userId))?.noticesOff ??
      DEFAULT_NOTICES_OFF),
  ];
};
