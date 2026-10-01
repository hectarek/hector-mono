import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { AuthProvider } from "@/app/_providers/auth-provider";

// ThemeProvider goes outside AuthProvider: NeonAuthUIProvider wraps its own next-themes
// provider, which steps aside when one is already above it, as long as both use the same
// next-themes copy (hectors-recipes' tests/app/_providers/providers.test.ts checks this).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
