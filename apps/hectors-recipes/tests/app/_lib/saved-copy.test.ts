import { describe, expect, it } from "bun:test";
import { refreshIfSaved } from "@/app/_lib/saved-copy";
import { SAVED_MARK } from "@/service-worker/rules";

// The page's root element, marked or not by the service worker.
function root(marked: boolean) {
  const attributes = new Set(marked ? [SAVED_MARK] : []);
  return {
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => {
      attributes.delete(name);
    },
  };
}

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

function check(overrides: Partial<Parameters<typeof refreshIfSaved>[0]> = {}) {
  let refreshes = 0;
  const context = {
    root: root(true),
    online: true,
    storage: memoryStorage(),
    now: 1_000_000,
    page: "/plan",
    refresh: () => {
      refreshes += 1;
    },
    ...overrides,
  };
  const refreshed = refreshIfSaved(context);
  return { refreshed, refreshes: () => refreshes, context };
}

describe("refreshIfSaved", () => {
  it("brings a page served from its saved copy up to date, and clears the mark", () => {
    const { refreshed, refreshes, context } = check();
    expect(refreshed).toBe(true);
    expect(refreshes()).toBe(1);
    expect(context.root.hasAttribute(SAVED_MARK)).toBe(false);
  });

  it("leaves a page the network served alone", () => {
    const { refreshed, refreshes } = check({ root: root(false) });
    expect(refreshed).toBe(false);
    expect(refreshes()).toBe(0);
  });

  it("doesn't try offline", () => {
    const { refreshed, refreshes } = check({ online: false });
    expect(refreshed).toBe(false);
    expect(refreshes()).toBe(0);
  });

  // A failed refresh loads the whole page, which the worker answers with the saved copy again.
  it("refreshes a page once in 30 seconds, so a failing refresh can't go round", () => {
    const storage = memoryStorage();
    expect(check({ storage }).refreshed).toBe(true);
    expect(check({ storage, now: 1_000_000 + 10_000 }).refreshed).toBe(false);
    expect(check({ storage, page: "/groceries" }).refreshed).toBe(true);
    expect(check({ storage, now: 1_000_000 + 31_000 }).refreshed).toBe(true);
  });

  it("refreshes even where storage is refused", () => {
    const refused = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(check({ storage: refused }).refreshed).toBe(true);
  });
});
