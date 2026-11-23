"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { listed } from "@/src/entities/listed";
import { ordinal } from "@/src/entities/loan";

// A night's change shows on Nights, the night's page, its people's friend pages and the inbox
// (KTD16), so each revalidates the whole app. The page that sent it renders again with the change.
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

// D5's fields as its form keeps them: the night's day and its clock times in Eastern time.
export type NightDetails = {
  name: string;
  date: string;
  startsAt: string;
  endsAt: string | null;
  place: string;
  address: string;
  note: string;
  capacity: number;
  audience: "friends" | "invited";
};

// What a night's form gets back: what went wrong, or what happened and where to go next.
export type NightFormState = ActionState | { message: string; href: string };

// Create and invite people, or Create game night (D5). A night only invited people see goes on to
// Invite people (D10), any other to its page (D7).
export async function createNight(
  input: NightDetails & {
    attendeesCanInvite: boolean;
    guestsAllowed: boolean;
    userGameIds: string[];
  },
): Promise<NightFormState> {
  try {
    const userId = await getCurrentUserId();
    const night = await getInjection("ICreateNightController")(input, userId);
    revalidateEverything();
    return {
      message: `${night.title} is on Nights.`,
      href:
        night.audience === "invited"
          ? `/nights/${night.id}/invite`
          : `/nights/${night.id}`,
    };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("createNight"),
      "That didn’t save. Try again.",
    );
  }
}

// Edit's Save (from D7), which goes back to the night: the message names who's told, from the
// people going the screen showed.
export async function updateNight(
  gameNightId: string,
  details: NightDetails,
  going: { userId: string; name: string }[],
): Promise<NightFormState> {
  try {
    const userId = await getCurrentUserId();
    const { told } = await getInjection("IUpdateNightController")(
      { gameNightId, ...details },
      userId,
    );
    revalidateEverything();
    const names = going
      .filter((one) => told.includes(one.userId))
      .map((one) => one.name);
    return {
      message:
        names.length === 0
          ? "Saved."
          : `Saved. ${listed(names)} ${names.length === 1 ? "is" : "are"} told.`,
      href: `/nights/${gameNightId}`,
    };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("updateNight"),
      "That didn’t save. Try again.",
    );
  }
}

// Edit's two switches, each saved as it's flipped (rule 4): People going can invite others, and
// People can bring guests.
export async function setNightSwitch(
  gameNightId: string,
  which: "attendees-can-invite" | "guests-allowed",
  on: boolean,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUpdateNightController")(
      which === "attendees-can-invite"
        ? { gameNightId, attendeesCanInvite: on }
        : { gameNightId, guestsAllowed: on },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setNightSwitch"),
      "Couldn’t save that. Try again.",
    );
  }
  revalidateEverything();
  return { message: "Saved." };
}

// D2's, D3's and D4's answers. The page then shows the member's stamp, and their piece in a seat
// when they're going (screens.md, Answer a game night). A seat taken meanwhile is the changed
// line, with Join the waitlist.
export async function answerNight(
  gameNightId: string,
  answer: "going" | "waitlisted" | "maybe" | "cant-go",
  guests = 0,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const answered = await getInjection("IAnswerNightController")(
      { gameNightId, answer, guests },
      userId,
    );
    revalidateEverything();
    return { message: answeredWords(answered) };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("answerNight"),
      "That didn’t send. Try again.",
    );
  }
}

function answeredWords({
  status,
  guestCount,
  place,
}: {
  status: string;
  guestCount: number;
  place: number | null;
}): string {
  if (status === "waitlisted") {
    return place
      ? `You’re ${ordinal(place)} on the waitlist.`
      : "You’re on the waitlist.";
  }
  if (status === "going") {
    return guestCount === 0
      ? "You’re going."
      : `You’re going, with ${guestCount} ${guestCount === 1 ? "guest" : "guests"}.`;
  }
  return status === "maybe" ? "You said maybe." : "You said you can’t go.";
}

// Send invites (D10): back on the night's page, each person shows as Invited until they answer.
export async function inviteToNight(
  gameNightId: string,
  people: { userId: string; name: string }[],
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const invited = await getInjection("IInviteToNightController")(
      { gameNightId, userIds: people.map((one) => one.userId) },
      userId,
    );
    revalidateEverything();
    const names = people
      .filter((one) => invited.includes(one.userId))
      .map((one) => one.name);
    return {
      message:
        names.length === 0
          ? "They’re on the list already."
          : `${listed(names)} ${names.length === 1 ? "is" : "are"} invited and told.`,
    };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("inviteToNight"),
      "That didn’t send. Try again.",
    );
  }
}

// Make a new link (D7), after its dialog.
export async function makeNightLink(gameNightId: string): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IMakeNightLinkController")({ gameNightId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("makeNightLink"),
      "That didn’t make a link. Try again.",
    );
  }
  revalidateEverything();
  return { message: "New link made. The old one stops working." };
}

// A night's link opened signed in: the night to open, or what went wrong.
export async function openNightLink(
  token: string,
): Promise<{ gameNightId?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const gameNightId = await getInjection("IOpenNightLinkController")(
      { token },
      userId,
    );
    revalidateEverything();
    return { gameNightId };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("openNightLink"),
      "That link didn’t open. Try again.",
    );
    return { error: state?.error };
  }
}

// D11's Cancel the night, after "Cancel Heavy games at mine?", with its optional note. Nights
// opens after (D15), with Text them too.
export async function cancelNight(
  gameNightId: string,
  note: string,
): Promise<ActionState> {
  let title: string;
  try {
    const userId = await getCurrentUserId();
    ({ title } = await getInjection("ICancelNightController")(
      { gameNightId, note },
      userId,
    ));
  } catch (err) {
    return toActionError(
      err,
      actionLogger("cancelNight"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${title} is cancelled` };
}

// Take someone off the waitlist (D7), after its dialog.
export async function removeFromWaitlist(
  gameNightId: string,
  memberId: string,
  name: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IRemoveFromWaitlistController")(
      { gameNightId, memberId },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeFromWaitlist"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${name} is off the waitlist. ${name} is told.` };
}

// I'll bring a game (D6 from a night): the newly ticked copies go on the table, the unticked ones
// come off it.
export async function bringGames(
  gameNightId: string,
  adding: { userGameId: string; title: string }[],
  removing: string[],
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    if (adding.length > 0) {
      await getInjection("IAddGameToNightController")(
        { gameNightId, userGameIds: adding.map((one) => one.userGameId) },
        userId,
      );
    }
    for (const userGameId of removing) {
      await getInjection("IRemoveGameFromNightController")(
        { gameNightId, userGameId },
        userId,
      );
    }
  } catch (err) {
    return toActionError(
      err,
      actionLogger("bringGames"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  const titles = adding.map((one) => one.title);
  return {
    message:
      titles.length > 0
        ? `${listed(titles)} ${titles.length === 1 ? "is" : "are"} on the table.`
        : "Taken off the table.",
  };
}

// I'd play, or not (D7, D13): the button and the count show it.
export async function voteOnGame(
  gameNightId: string,
  userGameId: string,
  play: boolean,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IVoteController")(
      { gameNightId, userGameId, play },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("voteOnGame"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  return null;
}
