import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname } from "node:path";

// Packages only a few requests use (reading a recipe with AI, the live-updates pass). Their
// adapters import them on first use, so a server function starting up doesn't load them
// (docs/ux-plan.md P30.2).
const ON_FIRST_USE = ["ai", "@ai-sdk/gateway", "ably", "unpdf"];

const transpilers = {
  ts: new Bun.Transpiler({ loader: "ts" }),
  tsx: new Bun.Transpiler({ loader: "tsx" }),
};

function packageName(specifier: string): string {
  const [first = "", second = ""] = specifier.split("/");
  return first.startsWith("@") ? `${first}/${second}` : first;
}

// Every package a file loads through its static imports, followed through the app's own
// files. The transpiler drops type-only imports, and `import()` is left out: it loads later.
function packagesLoadedBy(entry: string): Set<string> {
  const packages = new Set<string>();
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const transpiler = file.endsWith(".tsx") ? transpilers.tsx : transpilers.ts;
    for (const { path, kind } of transpiler.scanImports(
      readFileSync(file, "utf8"),
    )) {
      if (kind !== "import-statement" && kind !== "require-call") continue;
      if (isBuiltin(path)) continue;
      const resolved = Bun.resolveSync(path, dirname(file));
      if (resolved.includes("/node_modules/")) packages.add(packageName(path));
      else visit(resolved);
    }
  };
  visit(entry);
  return packages;
}

describe("the DI container", () => {
  test("doesn't load a package that only some requests use", () => {
    const loaded = packagesLoadedBy(
      Bun.resolveSync("@/di/container", import.meta.dir),
    );
    expect(ON_FIRST_USE.filter((name) => loaded.has(name))).toEqual([]);
  });

  test("still loads what every request uses", () => {
    // Guards the walk itself: if it stopped following imports, the test above would pass.
    const loaded = packagesLoadedBy(
      Bun.resolveSync("@/di/container", import.meta.dir),
    );
    expect(loaded.has("drizzle-orm")).toBe(true);
    expect(loaded.has("@neondatabase/auth")).toBe(true);
  });
});
