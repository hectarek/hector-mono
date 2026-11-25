import { useSyncExternalStore } from "react";
import {
  EMAIL_TAKEN_LINE,
  WRONG_PASSWORD_LINE,
} from "@/app/_lib/auth-localization";

// What Neon's sign-in kit says back (its toast, which the provider hands to us instead of
// showing): a wrong password, an email that already has an account, a code sent. The kit's page
// draws it under its form as a line (AuthNotice), in the app's words.
export type AuthMessage = { variant: "error" | "status"; message: string };

// Neon's messages for an email that already has an account, and for a wrong password. The kit's
// toast for the first carries only the message (its thrown error has no `error.code` for
// `localization` to pick by, checked on the test project 2026-11-21), so toAuthMessage words
// both by their message; the lines themselves are in auth-localization.ts.
const EMAIL_TAKEN_MESSAGE = /^user already exists/i;

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
