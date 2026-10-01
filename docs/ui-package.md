# @repo/ui

Shared UI for every app: shadcn/ui components (style `base-nova`, on Base UI), the theme tokens, and the dark-mode provider. The rules and the reasons behind them are in [packages/ui/AGENTS.md](../packages/ui/AGENTS.md); this page is the how-to.

## Using it

```tsx
import { Button } from "@repo/ui/components/button";
import { ThemeProvider, useTheme } from "@repo/ui/components/theme-provider";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { cn } from "@repo/ui/lib/utils";
```

Style with the theme's utilities (`bg-primary`, `text-muted-foreground`, `text-warning-foreground`, `rounded-lg`) and the components' `variant` / `size` props, not raw colours or restyling through `className`. The design-system lint (`oxlint`, see the root [AGENTS.md](../AGENTS.md#design-system-lint)) flags both.

## Setting up an app

Copy an existing app where you can: `apps/hectors-tools` for a plain app, `apps/hectors-recipes` for one with Neon Auth. The pieces:

**`package.json`**: `"@repo/ui": "workspace:*"`, plus `tailwindcss` and `@tailwindcss/postcss` as dev dependencies. Not `next-themes`; it comes through `@repo/ui`. Not `tw-animate-css` either: `@repo/ui`'s `globals.css` imports it and resolves it from `@repo/ui`'s own devDependencies (`hectors-recipes` and `stash` don't list it).

**`components.json`** (so the shadcn CLI, run from the app, installs components into `packages/ui`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/app/_components",
    "hooks": "@/app/_hooks",
    "lib": "@/app/_lib",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components"
  }
}
```

**`postcss.config.mjs`**: `export default { plugins: { "@tailwindcss/postcss": {} } };`

**`app/globals.css`**: one import. No `@source` lines (Tailwind finds the app's files; the package lists its own) and no token definitions (they come from the theme):

```css
@import "@repo/ui/styles/globals.css";
```

With Neon Auth UI, copy [apps/hectors-recipes/app/globals.css](../apps/hectors-recipes/app/globals.css) instead: the layer order, the import order and the radius line all matter.

**`app/layout.tsx`**: fonts as `--font-sans` (and optionally `--font-heading`, `--font-mono`), on `<html>` with `font-sans`:

```tsx
const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

<html
  lang="en"
  suppressHydrationWarning
  className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
>
  <body>
    <Providers>{children}</Providers>
  </body>
</html>
```

**`app/_providers/providers.tsx`**: `ThemeProvider` from `@repo/ui` at the top. It follows the device's light or dark setting by default; read or change the mode with `useTheme` (`setTheme("light" | "dark" | "system")`). With Neon Auth, `ThemeProvider` goes outside `NeonAuthUIProvider`. A light-only app leaves it out: `relationship-meter` renders only `TooltipProvider`.

```tsx
"use client";

import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { TooltipProvider } from "@repo/ui/components/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
```

## Themes

Every app gets the default theme (shadcn's neutral preset plus success / warning / info colours), in light and dark. To use another theme:

```css
/* app/globals.css */
@import "@repo/ui/styles/globals.css";
@import "@repo/ui/styles/themes/neobrutalist.css";
```

```tsx
<html data-theme="neobrutalist" data-neo="blue" …>
```

A theme can also define surfaces (tokens for one kind of page, turned on by `data-surface` on the page's root; `recipes.css` has `reading` and `cook`) and its own spacing step. For the iPhone notch and home bar, use `pt-safe`, `pb-safe` and `pb-safe-<n>` rather than `env()` values.

To add one, create `packages/ui/src/styles/themes/<name>.css` that sets tokens under `[data-theme="<name>"]` and again for dark under `[data-theme="<name>"].dark, .dark [data-theme="<name>"]`. Set only the tokens that differ; the rest come from the default. `bun run test --filter=@repo/ui` checks that every token set for light is also set for dark. The full token list and the rules are under "Theming" in [packages/ui/AGENTS.md](../packages/ui/AGENTS.md).

## Adding or updating components

Use the shadcn CLI from an app (`cd apps/<app> && bunx --bun shadcn@latest add <component>`); don't hand-write primitives. The update routine, and the few spots to re-fix after an update, are under "Adding components" in [packages/ui/AGENTS.md](../packages/ui/AGENTS.md).
