"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  photoOf,
  toActionError,
  typed,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";

// The record's fields as G3's and G4's form sends them, for their controllers to check.
const GAME_FIELDS = [
  "type",
  "baseGameId",
  "title",
  "year",
  "publishers",
  "designers",
  "minPlayers",
  "maxPlayers",
  "bestPlayers",
  "minMinutes",
  "maxMinutes",
  "minAge",
  "complexity",
  "categories",
  "description",
  "imageUrl",
  "imageCredit",
  "imageSourceUrl",
  "videoUrl",
] as const;

async function gameForm(formData: FormData) {
  return {
    ...Object.fromEntries(
      GAME_FIELDS.map((field) => [field, typed(formData, field)]),
    ),
    type: typed(formData, "type") || "base-game",
    photo: (await photoOf(formData, "image")) ?? null,
  };
}

// Every page a suggestion's answer shows on: the admin's lists, and the suggester's library.
function revalidateSuggestions(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/suggestions/answered");
  revalidatePath("/my-library");
  revalidatePath("/");
}

// G2's Send answer for It's already here (the game picked) or Decline (with its reason). The
// suggester is told, and a game already here lands in their library (R4).
export async function answerSuggestion(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const answer = typed(formData, "answer");
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAnswerSuggestionController")(
      {
        suggestionId: typed(formData, "suggestionId"),
        answer:
          answer === "declined"
            ? {
                status: "declined",
                declineNote: typed(formData, "declineNote"),
              }
            : { status: answer, gameId: typed(formData, "gameId") },
      },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("answerSuggestion"),
      "Couldn’t send that. Try again.",
    );
  }
  revalidateSuggestions();
  return { message: "Answer sent." };
}

// G3's Add to the catalog (R5), from a suggestion or not: "Pocket Regatta is in the catalog", and
// the form goes back to Admin.
export async function addGame(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    const game = await getInjection("IAddGameController")(
      {
        ...(await gameForm(formData)),
        suggestionId: typed(formData, "suggestionId"),
      },
      userId,
    );
    revalidateSuggestions();
    revalidatePath("/admin/games");
    return { message: `${game.title} is in the catalog` };
  } catch (err) {
    return toActionError(
      err,
      actionLogger("addGame"),
      "Couldn’t add that. Try again.",
    );
  }
}

// G4's Save (R5, R7): "Saved."
export async function updateGame(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gameId = typed(formData, "gameId");
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUpdateGameController")(
      { ...(await gameForm(formData)), gameId },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("updateGame"),
      "Couldn’t save that. Try again.",
    );
  }
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/");
  return { message: "Saved." };
}

// G8's Remove Dev's account, after its dialog: the account ends as a deleted one does, and a
// removed_users row keeps it out. Its people's libraries, nights and loans change, so the whole
// app revalidates. Admin opens after.
export async function removeAccount(userId: string): Promise<ActionState> {
  let name: string;
  try {
    const adminId = await getCurrentUserId();
    ({ name } = await getInjection("IRemoveAccountController")(
      { userId },
      adminId,
    ));
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeAccount"),
      "That didn’t save. Try again.",
    );
  }
  revalidatePath("/", "layout");
  return { message: `${name}’s account is removed` };
}
