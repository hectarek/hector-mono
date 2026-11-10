import { describe, expect, test } from "bun:test";
import { packagesLoadedBy } from "@/tests/_support/static-imports";

// Neon's sign-in kit (its React components and the browser's auth client) loads only on the
// pages that draw its views, through their own layouts (docs/ux-plan.md D102, P31.1). The
// layouts every other page shares must not reach it. Its path constants (/react/ui/server)
// are plain strings, so they're allowed.
const KIT = (specifier: string) =>
  (specifier.startsWith("@neondatabase/auth/react") &&
    specifier !== "@neondatabase/auth/react/ui/server") ||
  specifier === "@neondatabase/auth/next";

const layouts = () =>
  packagesLoadedBy(
    Bun.resolveSync("@/app/layout", import.meta.dir),
    Bun.resolveSync("@/app/(main)/layout", import.meta.dir),
  );

describe("the root and signed-in layouts", () => {
  test("don't load Neon's sign-in kit", () => {
    expect([...layouts()].filter(KIT)).toEqual([]);
  });

  test("still load the app's own components", () => {
    // Guards the walk itself: the header's icons come from lucide-react.
    expect(layouts().has("lucide-react")).toBe(true);
  });
});
