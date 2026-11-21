import type { ChangedReason } from "@/src/entities/errors/common";

// What a sheet says when something changed underneath (KTD16; screens.md, When something goes
// wrong): one line, and the next best action where there is one. Nothing was sent. The boards
// don't draw these, so the words can still change (screens.md, States that weren't drawn).
export const CHANGED_LINES: Record<
  ChangedReason,
  { line: string; next?: string }
> = {
  "copy-lent": {
    line: "It was just lent to someone else.",
    next: "Join the line",
  },
  "request-withdrawn": { line: "That request was withdrawn." },
  "request-answered": { line: "That request was already answered." },
  "seats-taken": {
    line: "The last seat was just taken.",
    next: "Join the waitlist",
  },
  "night-cancelled": { line: "This game night was cancelled." },
  "not-friends": { line: "You aren’t friends any more." },
};
