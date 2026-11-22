import { type ExternalToast, toast } from "sonner";

// The app's toaster (app/layout.tsx), by its id, as job-search's is: Neon Auth's provider (U5's
// sign-in pages) mounts a sonner toaster of its own, and a toast with no toaster id shows on
// every toaster without one, so a screen reader would read it twice. Sonner shows a toast with
// an id only on the toaster with that id.
export const APP_TOASTER = "app";

// Says what happened (screens.md rule 5, KTD17): a short message naming the result, with Undo
// where the action can be undone ({ action: { label: "Undo", onClick } }).
export function notify(message: string, options: ExternalToast = {}) {
  return toast(message, { ...options, toasterId: APP_TOASTER });
}

// A send that failed (screens.md, When something goes wrong): the page keeps what was typed,
// and Try again sends it again.
export function notifyNotSent(tryAgain: () => void) {
  return notify("That didn’t send.", {
    action: { label: "Try again", onClick: tryAgain },
  });
}
