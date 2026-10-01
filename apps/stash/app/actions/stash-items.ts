"use server";

import { revalidatePath } from "next/cache";
import { getInjection } from "@/di/container";
import {
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

export type ActionState = { error?: string; success?: boolean } | null;

async function getUserId(): Promise<string | undefined> {
  const authService = getInjection("IAuthenticationService");
  const session = await authService.getSession();
  return session?.user.id;
}

export async function addItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const logger = getInjection("ILoggerService").child({
    layer: "action",
    op: "addItem",
  });

  try {
    const userId = await getUserId();
    const rawType = formData.get("type") as string | null;
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
      url: formData.get("url") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      type,
      source: (formData.get("source") as string) || undefined,
    };

    logger.debug("Processing request", { url: data.url, title: data.title });

    const controller = getInjection("IAddItemController");
    await controller(data, userId);
  } catch (err) {
    if (err instanceof InputParseError) {
      logger.warn("Input validation failed", { error: err.message });
      return { error: err.message };
    }
    if (err instanceof UnauthenticatedError) {
      logger.warn("Unauthenticated attempt");
      return { error: "Must be logged in to add items" };
    }
    logger.error("Unexpected failure", { error: String(err) });
    return { error: "Failed to add item. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function completeItem(formData: FormData): Promise<void> {
  const logger = getInjection("ILoggerService").child({
    layer: "action",
    op: "completeItem",
  });
  const itemId = formData.get("itemId") as string;

  try {
    const userId = await getUserId();
    const controller = getInjection("ICompleteItemController");
    await controller({ itemId }, userId);
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof UnauthorizedError ||
      err instanceof UnauthenticatedError
    ) {
      logger.warn("Operation denied", { error: err.message, itemId });
      return;
    }
    logger.error("Unexpected failure", { error: String(err), itemId });
    return;
  }

  revalidatePath("/");
}

export async function deleteItem(formData: FormData): Promise<void> {
  const logger = getInjection("ILoggerService").child({
    layer: "action",
    op: "deleteItem",
  });
  const itemId = formData.get("itemId") as string;

  try {
    const userId = await getUserId();
    const controller = getInjection("IDeleteItemController");
    await controller({ itemId }, userId);
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof UnauthorizedError ||
      err instanceof UnauthenticatedError
    ) {
      logger.warn("Operation denied", { error: err.message, itemId });
      return;
    }
    logger.error("Unexpected failure", { error: String(err), itemId });
    return;
  }

  revalidatePath("/");
}
