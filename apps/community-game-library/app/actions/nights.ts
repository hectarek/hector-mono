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
