import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import {
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

// Helpers for app/actions/*: not a "use server" module, so nothing here is callable from the client.

export type ActionState = { error?: string; success?: boolean } | null;

export function actionLogger(op: string): DI_RETURN_TYPES["ILoggerService"] {
  return getInjection("ILoggerService").child({ layer: "action", op });
}

export function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

// Domain errors carry a message meant for the user; anything else shows the action's fallback.
export function toActionError(
  err: unknown,
  logger: DI_RETURN_TYPES["ILoggerService"],
  fallback: string,
): ActionState {
  if (err instanceof InputParseError) {
    logger.warn("Input validation failed", { error: err.message });
    return { error: err.message };
  }
  if (err instanceof UnauthenticatedError) {
    logger.warn("Unauthenticated attempt");
    return { error: err.message };
  }
  if (err instanceof UnauthorizedError || err instanceof NotFoundError) {
    logger.warn("Operation denied", { error: err.message });
    return { error: err.message };
  }
  logger.error("Unexpected failure", { error: String(err) });
  return { error: fallback };
}
