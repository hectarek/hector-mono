import { describe, expect, test } from "bun:test";
import { packagesLoadedBy } from "@/tests/_support/static-imports";

// Neon's sign-in kit (its React components and the browser's auth client) loads only on the
// pages that draw its views, through their own layouts (docs/build-plan.md KTD2, recipes' D102).
// The layouts every other page shares must not reach it. Its path constants (/react/ui/server)
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

  test("the walk follows the app's own imports into the packages they load", () => {
    // Guards the walk itself: if it stopped following imports, the test above would pass. The
    // root layout reaches sonner through @repo/ui's Toaster, and the Library page the DI
    // container through the app's own files.
    expect(layouts().has("sonner")).toBe(true);
    const page = packagesLoadedBy(
      Bun.resolveSync("@/app/(main)/page", import.meta.dir),
    );
    expect(page.has("@evyweb/ioctopus")).toBe(true);
  });
});
