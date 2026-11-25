"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { FriendLink } from "@/src/entities/models/friend-link.model";
import type { FriendRequestAnswer } from "@/src/entities/models/friend-request.model";
import { formatDate, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// A friendship changes what a member sees everywhere: the Library, games' and copies' pages,
// Friends and a friend's page (KTD16).
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

// A request changes Friends and step 2 of setting up.
function revalidateRequests(): void {
  revalidatePath("/friends");
  revalidatePath("/start/friends");
}

// The names in these messages come from the row tapped, as its screen shows them: they only say
// what happened to the person who tapped it.

// Your friend link as E2's sheet shows it: its code, which the sheet puts after the address the
// page was opened at, and the day it stops working, from the server's today (KTD9).
export type FriendLinkState =
  | { token: string; worksUntil: string; message?: string; error?: undefined }
  | {
      error: string;
      token?: undefined;
      worksUntil?: undefined;
      message?: undefined;
    };

function shownLink({ token, expiresAt }: FriendLink) {
  return {
    token,
    worksUntil: formatDate(
      todayIn(PLAN_TIME_ZONE, expiresAt),
      todayIn(PLAN_TIME_ZONE),
    ),
  };
}

// E2's sheet as it opens (R49): your friend link, or a new one when none works. The link is read
// when the sheet opens rather than with the pages that offer it, so the Library, My library and
// Friends read nothing more to show their button, and no page load or prefetch makes a link.
export async function getFriendLink(): Promise<FriendLinkState> {
  try {
    const userId = await getCurrentUserId();
    return shownLink(await getInjection("IGetFriendLinkController")(userId));
  } catch (err) {
    const fallback = "Couldn’t show your friend link. Try again.";
    const state = toActionError(err, actionLogger("getFriendLink"), fallback);
    return { error: state?.error ?? fallback };
  }
}

// E2's Make a new link, after "Make a new link?": the sheet shows the new link it gives back. No
// page shows the link, so there's nothing to revalidate.
export async function makeFriendLink(): Promise<FriendLinkState> {
  try {
    const userId = await getCurrentUserId();
    const link = await getInjection("IMakeFriendLinkController")(userId);
    return {
      ...shownLink(link),
      message: "New link made. The old one no longer works.",
    };
  } catch (err) {
    const fallback = "Couldn’t make a new link. Try again.";
    const state = toActionError(err, actionLogger("makeFriendLink"), fallback);
    return { error: state?.error ?? fallback };
  }
}

// What opening a friend link gives back: the new friend, whose page comes next.
export type OpenFriendLinkState =
  | { friendId: string; name: string; error?: undefined }
  | { error: string; friendId?: undefined; name?: undefined };

// A friend link, signed in (R49): sent by its page as it opens, never by the page's load.
export async function openFriendLink(
  token: string,
): Promise<OpenFriendLinkState> {
  try {
    const userId = await getCurrentUserId();
    const friend = await getInjection("IOpenFriendLinkController")(
      { token },
      userId,
    );
    revalidateEverything();
    return { friendId: friend.userId, name: friend.name };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("openFriendLink"),
      "This link no longer works. Ask your friend for a new one.",
    );
    return {
      error:
        state?.error ??
        "This link no longer works. Ask your friend for a new one.",
    };
  }
}

// Add friend (E1, A5).
export async function sendFriendRequest(
  recipientUserId: string,
  name: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ISendFriendRequestController")(
      { recipientUserId },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("sendFriendRequest"),
      "That didn’t send. Try again.",
    );
  }
  revalidateRequests();
  return { message: `Request sent to ${name}.` };
}

// E1's Accept and Decline: "You and Mei are friends.", or the row goes and Mei isn't told.
export async function answerFriendRequest(
  requestId: string,
  answer: FriendRequestAnswer,
  name: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAnswerFriendRequestController")(
      { requestId, answer },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("answerFriendRequest"),
      "That didn’t send. Try again.",
    );
  }
  if (answer === "accept") {
    revalidateEverything();
    return { message: `You and ${name} are friends.` };
  }
  revalidateRequests();
  return { message: `Declined. ${name} isn’t told.` };
}

// Cancel request (E1, A5).
export async function cancelFriendRequest(
  requestId: string,
  name: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ICancelFriendRequestController")({ requestId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("cancelFriendRequest"),
      "That didn’t send. Try again.",
    );
  }
  revalidateRequests();
  return { message: `Request to ${name} cancelled.` };
}

// Unfriend, after E4's dialog, which then goes back to Friends with this message.
export async function unfriend(
  friendId: string,
  name: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUnfriendController")({ friendId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("unfriend"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `Unfriended ${name}. ${name} isn’t told.` };
}
