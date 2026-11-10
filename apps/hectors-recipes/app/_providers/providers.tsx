import { ThemeProvider } from "@repo/ui/components/theme-provider";

// Neon's sign-in kit isn't here: only the sign-in and account pages use it, so their layouts
// add `AuthProvider` (docs/ux-plan.md D102). Its NeonAuthUIProvider wraps its own next-themes
// provider, which steps aside for this one (same next-themes copy, see
// tests/app/_providers/providers.test.ts).
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
