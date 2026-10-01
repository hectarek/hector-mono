import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The theme contract: every token a component or app may use (see themes/default.css).
const CONTRACT = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-foreground",
  "radius",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "info",
  "info-foreground",
];

const STYLES = join(__dirname, "../../../src/styles");
const THEMES = join(STYLES, "themes");

// Top-level rules of a flat stylesheet (theme files have no nesting): each selector in a
// rule's selector list → the custom properties that rule sets.
function tokensBySelector(css: string): Map<string, Set<string>> {
  const bySelector = new Map<string, Set<string>>();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selectorList = "", body = ""] of withoutComments.matchAll(
    /([^{}]+)\{([^{}]*)\}/g,
  )) {
    const tokens = [...body.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1] ?? "");
    for (const raw of selectorList.split(",")) {
      const selector = raw.replace(/\s+/g, " ").trim();
      const set = bySelector.get(selector) ?? new Set<string>();
      for (const token of tokens) set.add(token);
      bySelector.set(selector, set);
    }
  }
  return bySelector;
}

const read = (path: string) => readFileSync(path, "utf8");
const missing = (have: Set<string> | undefined, need: Iterable<string>) =>
  [...need].filter((token) => !have?.has(token));

describe("default theme", () => {
  const rules = tokensBySelector(read(join(THEMES, "default.css")));

  it("sets every contract token in light and dark", () => {
    expect(missing(rules.get(":root"), CONTRACT)).toEqual([]);
    expect(missing(rules.get(".dark"), CONTRACT)).toEqual([]);
  });
});

describe("globals.css", () => {
  const globals = read(join(STYLES, "globals.css"));

  it("exposes every contract colour as a Tailwind colour", () => {
    const colours = CONTRACT.filter((token) => token !== "radius");
    const unmapped = colours.filter(
      (token) => !globals.includes(`--color-${token}: var(--${token});`),
    );
    expect(unmapped).toEqual([]);
  });
});

// A theme may set only some tokens (the rest come from the default), but whatever it sets
// in light it must also set in dark, or the light value leaks into dark mode.
describe.each(readdirSync(THEMES).filter((file) => file !== "default.css"))(
  "theme %s",
  (file) => {
    const name = file.replace(/\.css$/, "");
    const rules = tokensBySelector(read(join(THEMES, file)));
    const light = `[data-theme="${name}"]`;

    it("is selected with data-theme and sets some tokens", () => {
      expect(rules.get(light)?.size ?? 0).toBeGreaterThan(0);
    });

    it("sets in dark mode every contract token it sets in light", () => {
      const setInLight = CONTRACT.filter((token) =>
        rules.get(light)?.has(token),
      );
      for (const dark of [`${light}.dark`, `.dark ${light}`]) {
        expect({ dark, missing: missing(rules.get(dark), setInLight) }).toEqual(
          { dark, missing: [] },
        );
      }
    });

    it("does the same for each colour variant (data-neo etc.)", () => {
      const variants = [...rules.keys()].filter(
        (selector) =>
          selector.startsWith(`${light}[`) && !selector.endsWith(".dark"),
      );
      for (const variant of variants) {
        const setInLight = CONTRACT.filter((token) =>
          rules.get(variant)?.has(token),
        );
        const dark = `${variant}.dark`;
        expect({
          variant,
          missing: missing(rules.get(dark), setInLight),
        }).toEqual({
          variant,
          missing: [],
        });
      }
    });

    // Surfaces re-value tokens for part of an app, picked by an element inside it
    // (`[data-theme="x"]:has([data-surface="reading"])`); dark must follow there too.
    it("does the same for each surface (:has(...))", () => {
      const surfaces = [...rules.keys()].filter((selector) =>
        selector.startsWith(`${light}:has(`),
      );
      for (const surface of surfaces) {
        const rest = surface.slice(light.length);
        const setInLight = CONTRACT.filter((token) =>
          rules.get(surface)?.has(token),
        );
        for (const dark of [`${light}.dark${rest}`, `.dark ${light}${rest}`]) {
          expect({
            dark,
            missing: missing(rules.get(dark), setInLight),
          }).toEqual({ dark, missing: [] });
        }
      }
    });
  },
);
