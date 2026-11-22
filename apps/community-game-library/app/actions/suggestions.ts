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

// B9's Send (R4): "Suggestion sent.", and My library shows it waiting on the admin. The admin is
// told.
export async function suggestGame(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ISuggestGameController")(
      {
        title: typed(formData, "title"),
        year: typed(formData, "year"),
        publisher: typed(formData, "publisher"),
        sourceUrl: typed(formData, "sourceUrl"),
        photo: (await photoOf(formData)) ?? null,
      },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("suggestGame"),
      "Couldn’t send that. Try again.",
    );
  }
  revalidatePath("/my-library");
  revalidatePath("/admin");
  return { message: "Suggestion sent." };
}
