"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState,
  actionLogger,
  text,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";

async function getUserId(): Promise<string | undefined> {
  const authService = getInjection("IAuthenticationService");
  const session = await authService.getSession();
  return session?.user.id;
}

export async function addItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const logger = actionLogger("addItem");

  try {
    const userId = await getUserId();
    const rawType = text(formData, "type");
    const validTypes = [
      "video",
      "article",
      "movie",
      "podcast",
      "other",
    ] as const;
    const type =
      rawType && validTypes.includes(rawType as (typeof validTypes)[number])
        ? (rawType as (typeof validTypes)[number])
        : undefined;

    const data = {
      url: text(formData, "url"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      type,
      source: text(formData, "source"),
    };

    logger.debug("Processing request", { url: data.url, title: data.title });

    const controller = getInjection("IAddItemController");
    await controller(data, userId);
  } catch (err) {
    return toActionError(err, logger, "Failed to add item. Please try again.");
  }

  revalidatePath("/");
  return { success: true };
}

export async function completeItem(formData: FormData): Promise<void> {
  const itemId = text(formData, "itemId");
  const logger = actionLogger("completeItem").child({ itemId });

  try {
    const userId = await getUserId();
    const controller = getInjection("ICompleteItemController");
    await controller({ itemId }, userId);
  } catch (err) {
    // The card shows no error, so this only logs.
    toActionError(err, logger, "Failed to complete item. Please try again.");
    return;
  }

  revalidatePath("/");
}

export async function deleteItem(formData: FormData): Promise<void> {
  const itemId = text(formData, "itemId");
  const logger = actionLogger("deleteItem").child({ itemId });

  try {
    const userId = await getUserId();
    const controller = getInjection("IDeleteItemController");
    await controller({ itemId }, userId);
  } catch (err) {
    // The card shows no error, so this only logs.
    toActionError(err, logger, "Failed to remove item. Please try again.");
    return;
  }

  revalidatePath("/");
}
