"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { NoticeGroup } from "@/src/entities/notice-types";

// The inbox, once it's open: the notices it listed are read, so the bell clears (R27). Its page
// sends it, so a prefetch of the inbox clears nothing.
export async function markInboxRead(
  noticeIds: readonly string[],
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IMarkInboxReadController")({ noticeIds }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("markInboxRead"),
      "Couldn’t mark them read.",
    );
  }
  revalidatePath("/", "layout");
  return null;
}

// One of Notices I get's switches (E7), saved as it flips.
export async function setNoticeGroup(
  group: NoticeGroup,
  on: boolean,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUpdateNoticeSettingsController")(
      { group, on },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setNoticeGroup"),
      "That didn’t save. Try again.",
    );
  }
  revalidatePath("/", "layout");
  return { message: "Saved." };
}
