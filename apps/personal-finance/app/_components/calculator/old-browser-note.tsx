import { useSyncExternalStore } from "react";

const noChanges = () => () => {};

// Shown until the page's code runs (R18): the prerendered page already holds the example's
// result, and this says the numbers change only once the page has loaded, in a newer browser.
// The server snapshot is false and the browser's is true, so the note goes on hydration and
// stays on a phone too old to run the code.
export function OldBrowserNote() {
  const running = useSyncExternalStore(
    noChanges,
    () => true,
    () => false,
  );
  if (running) return null;
  return (
    <p className="rounded-lg border bg-muted px-4 py-3 text-base">
      These numbers are an example. They change as you type once the page has
      loaded, in a newer browser.
    </p>
  );
}
