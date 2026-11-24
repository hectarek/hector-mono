import { describe, expect, test } from "bun:test";
import { createSavedFile } from "../../src/model/saved-file";
import {
  loadSavedFile,
  STORAGE_KEY,
  saveSavedFile,
  UNREADABLE_KEY,
} from "../../src/model/storage";

const NOW = new Date("2026-11-24T15:00:00.000Z");

function memoryStore() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

describe("loadSavedFile", () => {
  test("finds nothing in a fresh browser", () => {
    expect(loadSavedFile(memoryStore(), NOW)).toEqual({ status: "empty" });
  });

  test("loads what saveSavedFile wrote", () => {
    const store = memoryStore();
    const file = createSavedFile(NOW);
    expect(saveSavedFile(store, file)).toEqual({ ok: true });
    expect(loadSavedFile(store, NOW)).toEqual({ status: "loaded", file });
  });

  test("moves data it can't read aside instead of losing it", () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, "{broken");
    const result = loadSavedFile(store, NOW);
    expect(result).toEqual({
      status: "unreadable",
      reason: "The text isn't JSON.",
      keptAt: UNREADABLE_KEY,
    });
    expect(store.items.get(UNREADABLE_KEY)).toBe("{broken");
    expect(store.items.has(STORAGE_KEY)).toBe(false);
  });

  test("never overwrites earlier unreadable data", () => {
    const store = memoryStore();
    store.setItem(UNREADABLE_KEY, "{first");
    store.setItem(STORAGE_KEY, "{second");
    const result = loadSavedFile(store, NOW);
    expect(result).toMatchObject({
      keptAt: `${UNREADABLE_KEY}:2026-11-24T15:00:00.000Z`,
    });
    expect(store.items.get(UNREADABLE_KEY)).toBe("{first");
    expect(store.items.get(`${UNREADABLE_KEY}:2026-11-24T15:00:00.000Z`)).toBe(
      "{second",
    );
  });

  test("reports storage the browser blocks", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadSavedFile(blocked, NOW)).toEqual({ status: "unavailable" });
  });
});

describe("saveSavedFile", () => {
  test("says so when the browser refuses the write", () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    const result = saveSavedFile(full, createSavedFile(NOW));
    expect(result.ok).toBe(false);
  });
});
