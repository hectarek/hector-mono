import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import {
  DEFAULT_NOTICES_OFF,
  NOTICE_TYPE_GROUPS,
  NOTICE_TYPES,
  type NoticeType,
} from "@/src/entities/notice-types";

// The notice types a member sees: every type whose group they haven't switched off, and the
// types with no group (E7). A member with no settings row has the defaults.
export async function shownTypes(
  userSettingsRepository: IUserSettingsRepository,
  userId: string,
): Promise<NoticeType[]> {
  const settings = await userSettingsRepository.getByUserId(userId);
  const off = new Set(settings?.noticesOff ?? DEFAULT_NOTICES_OFF);
  return NOTICE_TYPES.filter((type) => {
    const group = NOTICE_TYPE_GROUPS[type];
    return group === null || !off.has(group);
  });
}
