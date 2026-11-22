"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { expansionName } from "@/src/entities/game-facts";

// Every page a copy shows on (KTD16): the Library (search's cards), My library, the game's page
// and the copy's own.
function revalidateCopy(gameId: string, userGameId?: string): void {
  revalidatePath("/");
  revalidatePath("/my-library");
  revalidatePath(`/games/${gameId}`);
  if (userGameId) {
    revalidatePath(`/copies/${userGameId}`);
  }
}

// What I own it gives back: the message, and the new copy for its Undo and Edit copy.
export type AddCopyState =
  | { message: string; userGameId: string; error?: undefined }
  | { error: string; message?: undefined; userGameId?: undefined };

// I own it (B8, B10, a game none of your friends own): "Harbor Master is in My library".
export async function addCopy(gameId: string): Promise<AddCopyState> {
  try {
    const userId = await getCurrentUserId();
    const { copy, game } = await getInjection("IAddUserGameController")(
      { gameId },
      userId,
    );
    revalidateCopy(gameId);
    return { message: `${game.title} is in My library`, userGameId: copy.id };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("addCopy"),
      "Couldn’t add that. Try again.",
    );
    return { error: state?.error ?? "Couldn’t add that. Try again." };
  }
}

// I own it's Undo: the copy just added goes again.
export async function undoAddCopy(
  userGameId: string,
  gameId: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IRemoveUserGameController")({ userGameId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("undoAddCopy"),
      "Couldn’t undo that. Try again.",
    );
  }
  revalidateCopy(gameId, userGameId);
  return { message: "Undone." };
}

// In my box (B8, B10): the expansion goes in the box of your copy of its base game, "Low Tide is
// in the box of your Gull & Anchor", and that copy's page shows it ticked.
export async function putInBox(gameId: string): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const { copy, expansion, baseGame } = await getInjection(
      "IPutInBoxController",
    )({ gameId }, userId);
    revalidateCopy(baseGame.id, copy.id);
    revalidatePath(`/games/${expansion.id}`);
    return {
      message: `${expansionName(expansion.title, baseGame.title)} is in the box of your ${baseGame.title}`,
    };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("putInBox"),
      "Couldn’t put it in the box. Try again.",
    );
  }
}

// B7's Save: the condition, what's missing, and the expansions ticked in the box.
export async function saveCopy(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const userGameId = text("userGameId");
  try {
    const userId = await getCurrentUserId();
    const saved = await getInjection("IUpdateUserGameController")(
      {
        userGameId,
        condition: text("condition"),
        conditionNote: text("conditionNote"),
        expansionIds: formData
          .getAll("expansionIds")
          .filter((id) => typeof id === "string"),
      },
      userId,
    );
    revalidateCopy(saved.gameId, userGameId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("saveCopy"),
      "Couldn’t save that. Try again.",
    );
  }
  return { message: "Saved." };
}

// One of B7's lending switches, as it flips: "Saved." (screens.md, Flip a switch). The page binds
// the copy and the switch, and the switch gives on or off.
export async function setLending(
  userGameId: string,
  lending: "lendable" | "pass-along",
  on: boolean,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const saved = await getInjection("ISetLendingController")(
      lending === "lendable"
        ? { userGameId, lendable: on }
        : { userGameId, passAlong: on },
      userId,
    );
    revalidateCopy(saved.gameId, userGameId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setLending"),
      "Couldn’t save that. Try again.",
    );
  }
  return { message: "Saved." };
}

// B6's "Friends can pass my games along", for every copy and the default.
export async function setPassAlongForAll(
  passAlong: boolean,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ISetPassAlongForAllController")({ passAlong }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setPassAlongForAll"),
      "Couldn’t save that. Try again.",
    );
  }
  revalidatePath("/my-library");
  revalidatePath("/copies/[id]", "page");
  return { message: "Saved." };
}

// B14's Remove it: the copy goes, with its box and its loan history. Refused while someone has it
// (AE2). The dialog then opens My library with the message.
export async function removeCopy(
  userGameId: string,
  gameId: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const { title } = await getInjection("IRemoveUserGameController")(
      { userGameId },
      userId,
    );
    revalidateCopy(gameId, userGameId);
    return { message: `${title} is removed from My library` };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeCopy"),
      "Couldn’t remove that. Try again.",
    );
  }
}
