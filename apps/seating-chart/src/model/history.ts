// Undo and redo over whole-plan snapshots (the spec's KTD5). Each change records the state it
// replaces; a drag records one step when it ends, not one per pointer move.

const DEFAULT_LIMIT = 200;

export type History<T> = { past: T[]; present: T; future: T[] };

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Makes `next` the present. Redo is cleared, and the oldest steps drop past the limit. */
export function record<T>(
  history: History<T>,
  next: T,
  limit = DEFAULT_LIMIT,
): History<T> {
  const past = [...history.past, history.present];
  return {
    past: past.slice(Math.max(0, past.length - limit)),
    present: next,
    future: [],
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
