import { useEffect, useState } from "react";

// How long typing must pause before the sentence is announced, so a screen reader speaks the
// settled result once rather than a figure per keystroke.
const SETTLE_MS = 500;

// The result's headline sentence (R14), or the message that names a field's fix (R16). Sighted
// readers see it change as they type; a screen reader hears it once, politely, after typing
// pauses (R23, KTD12). The visible copy is hidden from screen readers, so they read the
// announced one in its place and never hear the sentence twice.
export function ResultSentence({ message }: { message: string }) {
  const announced = useSettled(message);
  return (
    <div>
      <p aria-hidden="true" className="font-semibold text-xl">
        {message}
      </p>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announced}
      </p>
    </div>
  );
}

function useSettled(value: string): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}
