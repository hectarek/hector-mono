import { describe, expect, test } from "bun:test";
import { packageName, packagesLoadedBy } from "@/tests/_support/static-imports";

// Packages only a few requests use: storing a photo or a cover, or signing a photo's address.
// Their adapter imports them on first use, so a server function starting up doesn't load them
// (docs/build-plan.md KTD2, recipes' P30.2).
const ON_FIRST_USE = ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"];

const loaded = () =>
  new Set(
    [
      ...packagesLoadedBy(Bun.resolveSync("@/di/container", import.meta.dir)),
    ].map(packageName),
  );

describe("the DI container", () => {
  test("doesn't load a package that only some requests use", () => {
    const packages = loaded();
    expect(ON_FIRST_USE.filter((name) => packages.has(name))).toEqual([]);
  });

  test("still loads what every request uses", () => {
    // Guards the walk itself: if it stopped following imports, the test above would pass.
    const packages = loaded();
    expect(packages.has("drizzle-orm")).toBe(true);
    expect(packages.has("@neondatabase/auth")).toBe(true);
  });
});
