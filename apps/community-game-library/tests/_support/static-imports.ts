import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname } from "node:path";

const transpilers = {
  ts: new Bun.Transpiler({ loader: "ts" }),
  tsx: new Bun.Transpiler({ loader: "tsx" }),
};

const SOURCE = /\.(ts|tsx|js|mjs)$/;

// Every package the entry files load through their static imports, as written (with any
// subpath, such as "@neondatabase/auth/react"), following imports through the app's own
// files. The transpiler drops type-only imports, and `import()` is left out: it loads later.
export function packagesLoadedBy(...entries: string[]): Set<string> {
  const packages = new Set<string>();
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file) || !SOURCE.test(file)) return;
    seen.add(file);
    const transpiler = file.endsWith(".tsx") ? transpilers.tsx : transpilers.ts;
    for (const { path, kind } of transpiler.scanImports(
      readFileSync(file, "utf8"),
    )) {
      if (kind !== "import-statement" && kind !== "require-call") continue;
      if (isBuiltin(path)) continue;
      const resolved = Bun.resolveSync(path, dirname(file));
      if (resolved.includes("/node_modules/")) packages.add(path);
      else visit(resolved);
    }
  };
  for (const entry of entries) visit(entry);
  return packages;
}

// "@scope/name/sub" → "@scope/name", "name/sub" → "name".
export function packageName(specifier: string): string {
  const [first = "", second = ""] = specifier.split("/");
  return first.startsWith("@") ? `${first}/${second}` : first;
}
