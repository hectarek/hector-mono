import { type MouseEvent, useEffect, useSyncExternalStore } from "react";

// "Leave without saving?" (screens.md, Actions that ask first): while a form on the page has
// typed text, the back link and the tabs ask before they leave it. A form says it has typed
// text with useLeaveGuard; a link that leaves calls confirmLeave from its click; the one dialog
// in the signed-in layout (LeaveGuardDialog) asks, through useLeaveRequest.

let formsWithText = 0;
let held: (() => void) | null = null;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// For a form: true while it holds typed text that a save hasn't kept.
export function useLeaveGuard(hasTypedText: boolean): void {
  useEffect(() => {
    if (!hasTypedText) return;
    formsWithText += 1;
    return () => {
      formsWithText -= 1;
    };
  }, [hasTypedText]);
}

// For a link that leaves the page: it goes as usual, unless a form has typed text; then the
// tap is held and the dialog asks, and `go` leaves if the member says so. A tap that opens a
// new tab leaves the page as it is, so it goes.
export function confirmLeave(event: MouseEvent, go: () => void): void {
  if (
    formsWithText === 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }
  event.preventDefault();
  held = go;
  changed();
}

// For the dialog: whether a tap is held, and the two answers.
export function useLeaveRequest(): {
  asking: boolean;
  leave: () => void;
  stay: () => void;
} {
  const asking = useSyncExternalStore(
    subscribe,
    () => held !== null,
    () => false,
  );
  return {
    asking,
    leave: () => {
      const go = held;
      held = null;
      changed();
      go?.();
    },
    stay: () => {
      held = null;
      changed();
    },
  };
}
