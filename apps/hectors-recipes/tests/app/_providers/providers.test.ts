import { describe, expect, it } from "bun:test";
import { dirname } from "node:path";

const app = `${import.meta.dir}/../../..`;
const resolveFrom = (spec: string, file: string) =>
  Bun.resolveSync(spec, dirname(file));

describe("Providers", () => {
  // NeonAuthUIProvider wraps its own next-themes provider. It only steps aside for ours
  // when both use the same next-themes module; with two copies, two providers would
  // both drive the `dark` class and the theme setting would stop sticking.
  it("shares one next-themes copy with Neon Auth's UI", () => {
    const neonAuth = Bun.resolveSync("@neondatabase/auth/react", app);
    const neonAuthUi = resolveFrom("@neondatabase/auth-ui", neonAuth);
    const themeProvider = Bun.resolveSync(
      "@repo/ui/components/theme-provider",
      app,
    );

    expect(resolveFrom("next-themes", neonAuthUi)).toBe(
      resolveFrom("next-themes", themeProvider),
    );
  });
});
