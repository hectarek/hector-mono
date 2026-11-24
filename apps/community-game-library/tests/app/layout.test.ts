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

// The pages and layouts that open before the app, or that never draw the kit's views.
const outsideKit = () =>
  packagesLoadedBy(
    Bun.resolveSync("@/app/(start)/layout", import.meta.dir),
    Bun.resolveSync("@/app/(start)/start/profile/page", import.meta.dir),
    Bun.resolveSync("@/app/(start)/start/home-screen/page", import.meta.dir),
    Bun.resolveSync("@/app/(auth)/welcome/page", import.meta.dir),
    Bun.resolveSync("@/app/removed/page", import.meta.dir),
    Bun.resolveSync("@/app/(main)/you/page", import.meta.dir),
    Bun.resolveSync("@/app/(main)/you/edit/page", import.meta.dir),
    Bun.resolveSync("@/app/(legal)/privacy/page", import.meta.dir),
    Bun.resolveSync("@/app/(legal)/terms/page", import.meta.dir),
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

describe("the setup steps, the welcome page, the removed page, You, and the privacy policy and terms", () => {
  test("don't load Neon's sign-in kit either: their links to sign out and the account are plain links", () => {
    expect([...outsideKit()].filter(KIT)).toEqual([]);
  });
});

describe("the sign-in and account layouts", () => {
  // The other half of the guard: the kit is loaded where its views are drawn.
  test("are where the kit loads", () => {
    for (const layout of ["@/app/(auth)/auth/layout", "@/app/account/layout"]) {
      const loaded = packagesLoadedBy(Bun.resolveSync(layout, import.meta.dir));
      expect([...loaded].filter(KIT).length).toBeGreaterThan(0);
    }
  });
});
