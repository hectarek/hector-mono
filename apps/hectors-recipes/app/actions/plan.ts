"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";

// Called from client components with plain arguments (not forms).

export async function addPlanEntry(input: {
  spaceId?: string;
  recipeId: string;
  cookDate: string;
  eatDates: string[];
}): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    // No plan chosen (e.g. "Add to plan" before ever opening the Plan tab): use their own.
    const spaceId =
      input.spaceId ??
      (
        await getInjection("IEnsurePersonalSpaceController")(
          "meal-plan",
          userId,
        )
      ).id;
    await getInjection("IAddPlanEntryController")(
      { ...input, spaceId },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("addPlanEntry"),
      "Couldn't add that. Try again.",
    );
  }
  revalidatePath("/plan");
  return null;
}

export async function setEntryCooked(
  entryId: string,
  cooked: boolean,
): Promise<ActionState> {
  try {
    await getInjection("ISetEntryCookedController")(
      { entryId, cooked },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setEntryCooked"),
      "Couldn't update that meal.",
    );
  }
  revalidatePath("/plan");
  return null;
}

export async function changeEntryDays(
  entryId: string,
  days: { cookDate: string; eatDates: string[] },
): Promise<ActionState> {
  try {
    await getInjection("IChangeEntryDaysController")(
      { entryId, ...days },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("changeEntryDays"),
      "Couldn't change that meal's days.",
    );
  }
  revalidatePath("/plan");
  return null;
}

export async function removePlanEntry(entryId: string): Promise<ActionState> {
  try {
    await getInjection("IRemovePlanEntryController")(
      { entryId },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removePlanEntry"),
      "Couldn't remove that meal.",
    );
  }
  revalidatePath("/plan");
  return null;
}
