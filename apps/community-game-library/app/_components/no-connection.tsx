"use client";

import { useSyncExternalStore } from "react";

function subscribe(changed: () => void): () => void {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

// The no-connection line (X2; screens.md, When something goes wrong): the screen says so and
// never fails silently. A chipboard bar across the top while the phone is offline. What shows
// offline is the service worker's saved copies (U23).
export function NoConnection() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className="border-b-2 border-foreground bg-card px-4 py-2.5 font-mono text-xs leading-snug font-medium"
    >
      No connection. Showing what you last saw.
    </p>
  );
}
