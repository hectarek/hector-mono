import { type ExternalToast, toast } from "sonner";

// The shell's toaster (app-shell.tsx), by its id. Neon Auth's provider, which wraps every page,
// mounts a sonner toaster of its own, and the two share one copy of sonner: a toast with no
// toaster id showed on both, and a screen reader read it out twice (2026-11-07). Sonner shows a
// toast with a toaster's id only on that toaster, and one without an id only on toasters without
// one, so the app's toasts go to the shell's by its id and Neon's stay on Neon's.
export const APP_TOASTER = "app";

// A toast on the shell's toaster: what a save changed, with Undo where it can be taken back.
export function notify(message: string, options: ExternalToast = {}) {
  return toast(message, { ...options, toasterId: APP_TOASTER });
}
