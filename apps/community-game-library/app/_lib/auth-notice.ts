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

// The line for a sign-in whose email and password don't match (A8). Neon answers with the code
// INVALID_EMAIL_OR_PASSWORD and the message below: localization words it by the code, and
// toAuthMessage by the message, for a toast that carries no code, as the email-taken one doesn't.
export const WRONG_PASSWORD_LINE = "That password doesn’t match this email.";
const WRONG_PASSWORD_MESSAGE = /^invalid email or password/i;

const IN_THE_APPS_WORDS: readonly [RegExp, string][] = [
  [EMAIL_TAKEN_MESSAGE, EMAIL_TAKEN_LINE],
  [WRONG_PASSWORD_MESSAGE, WRONG_PASSWORD_LINE],
];

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
  const said = toast.message;
  if (!said) return null;
  return {
    variant: toast.variant === "error" ? "error" : "status",
    message:
      IN_THE_APPS_WORDS.find(([message]) => message.test(said))?.[1] ?? said,
  };
}
