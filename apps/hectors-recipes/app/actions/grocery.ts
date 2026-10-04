"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  text,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  AddToListResult,
  GroceryRange,
} from "@/src/entities/models/grocery-item.model";
import { editableSpaces } from "@/src/entities/models/space.model";

// Whose list, when none was chosen: the default plan they can edit, else their own plan
// (created if needed). A plan's grocery list is part of the plan.
async function resolvePlanId(
  userId: string | undefined,
  planId: string | undefined,
): Promise<string> {
  if (planId) {
    return planId;
  }
  const plans = await getInjection("IListMySpacesController")(
    { type: "meal-plan" },
    userId,
  );
  const [chosen] = editableSpaces(plans);
  return (
    chosen ??
    (await getInjection("IEnsurePersonalSpaceController")("meal-plan", userId))
  ).id;
}

export type AddToListState =
  | { ok: true; result: AddToListResult }
  | { ok: false; error: string }
  | null;

export async function addGroceryItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spaceId = text(formData, "spaceId");
  try {
    await getInjection("IAddGroceryItemController")(
      { spaceId, text: text(formData, "text") },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("addGroceryItem"),
      "Couldn't add that.",
    );
  }
  revalidatePath("/groceries");
  return { message: "added" };
}

export async function setGroceryItemChecked(
  itemId: string,
  checked: boolean,
): Promise<ActionState> {
  try {
    await getInjection("ISetGroceryItemCheckedController")(
      { itemId, checked },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setGroceryItemChecked"),
      "Couldn't update that item.",
    );
  }
  revalidatePath("/groceries");
  return null;
}

export async function removeGroceryItem(itemId: string): Promise<ActionState> {
  try {
    await getInjection("IRemoveGroceryItemController")(
      { itemId },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeGroceryItem"),
      "Couldn't remove that item.",
    );
  }
  revalidatePath("/groceries");
  return null;
}

export async function updateGroceryItem(
  itemId: string,
  text: string,
): Promise<ActionState> {
  try {
    await getInjection("IUpdateGroceryItemController")(
      { itemId, text },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("updateGroceryItem"),
      "Couldn't save that item.",
    );
  }
  revalidatePath("/groceries");
  return null;
}

export async function clearCheckedItems(spaceId: string): Promise<ActionState> {
  try {
    await getInjection("IClearCheckedItemsController")(
      { spaceId },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("clearCheckedItems"),
      "Couldn't clear the list.",
    );
  }
  revalidatePath("/groceries");
  return null;
}

// Every item goes, and the plan's meals can be added again (D52), so Plan's count changes too.
export async function clearGroceryList(spaceId: string): Promise<ActionState> {
  try {
    await getInjection("IClearGroceryListController")(
      { spaceId },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("clearGroceryList"),
      "Couldn't clear the list.",
    );
  }
  revalidatePath("/groceries");
  revalidatePath("/plan");
  return null;
}

export async function addRecipeToList(input: {
  recipeId: string;
  servings?: number;
  planId?: string;
  again?: boolean;
}): Promise<AddToListState> {
  try {
    const userId = await getCurrentUserId();
    const planId = await resolvePlanId(userId, input.planId);
    const result = await getInjection("IAddRecipesToListController")(
      {
        planId,
        recipes: [{ recipeId: input.recipeId, servings: input.servings }],
        again: input.again,
      },
      userId,
    );
    revalidatePath("/groceries");
    return { ok: true, result };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("addRecipeToList"),
      "Couldn't add it to the list.",
    );
    return { ok: false, error: state?.error ?? "Couldn't add it to the list." };
  }
}

// The planned meals in a range not on the list yet (D44), or one meal (D41).
export async function addPlanToList(input: {
  planId: string;
  entryId?: string;
  range?: GroceryRange;
  again?: boolean;
}): Promise<AddToListState> {
  try {
    const result = await getInjection("IAddPlanToListController")(
      input,
      await getCurrentUserId(),
    );
    revalidatePath("/groceries");
    revalidatePath("/plan");
    return { ok: true, result };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("addPlanToList"),
      "Couldn't add it to the list.",
    );
    return { ok: false, error: state?.error ?? "Couldn't add it to the list." };
  }
}
