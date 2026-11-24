import { parseSavedFile, type SavedFile } from "./saved-file";

// The browser's localStorage, or a stand-in with the same three methods in tests.
type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORAGE_KEY = "seating-chart";
export const UNREADABLE_KEY = "seating-chart:unreadable";

type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; file: SavedFile }
  | { status: "unreadable"; reason: string; keptAt: string }
  | { status: "unavailable" };

type SaveResult = { ok: true } | { ok: false; reason: string };

/**
 * Reads the saved plan. Data the app can't read is moved aside, never overwritten: to
 * UNREADABLE_KEY, or to a dated key beside it when that already holds something else.
 */
export function loadSavedFile(store: KeyValueStore, now: Date): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (raw === null) return { status: "empty" };

  const parsed = parseSavedFile(raw);
  if (parsed.ok) return { status: "loaded", file: parsed.file };

  const existing = store.getItem(UNREADABLE_KEY);
  const keptAt =
    existing === null || existing === raw
      ? UNREADABLE_KEY
      : `${UNREADABLE_KEY}:${now.toISOString()}`;
  store.setItem(keptAt, raw);
  store.removeItem(STORAGE_KEY);
  return { status: "unreadable", reason: parsed.reason, keptAt };
}

export function saveSavedFile(
  store: KeyValueStore,
  file: SavedFile,
): SaveResult {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(file));
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        "This browser didn't save the plan: its storage is full or blocked. Export the plan to keep a copy.",
    };
  }
}
