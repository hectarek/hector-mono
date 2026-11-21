import { useSyncExternalStore } from "react";

// What Neon's sign-in kit says back (its toast, which the provider hands to us instead of
// showing): a wrong password, an email that already has an account, a code sent. The kit's page
// draws it under its form as a line (AuthNotice), in the app's words.
export type AuthMessage = { variant: "error" | "status"; message: string };

// The line for an email that already has an account. Neon answers one with the code
// USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL and the message below. The kit's toast carries only the
// message (its thrown error has no `error.code` for `localization` to pick by, checked on the
// test project 2026-11-21), so toAuthMessage words it by the message.
export const EMAIL_TAKEN_LINE = "That email already has an account.";
const EMAIL_TAKEN_MESSAGE = /^user already exists/i;

let current: AuthMessage | null = null;
const listeners = new Set<() => void>();

export function showAuthMessage(message: AuthMessage | null): void {
  current = message;
  for (const listener of listeners) listener();
}

export function useAuthMessage(): AuthMessage | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => null,
  );
}

// The kit's toast: an error or a plain message becomes the line under the form.
export function toAuthMessage(toast: {
  variant?: string;
  message?: string;
}): AuthMessage | null {
  if (!toast.message) return null;
  return {
    variant: toast.variant === "error" ? "error" : "status",
    message: EMAIL_TAKEN_MESSAGE.test(toast.message)
      ? EMAIL_TAKEN_LINE
      : toast.message,
  };
}
