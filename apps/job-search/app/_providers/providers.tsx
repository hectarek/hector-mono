import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { AuthProvider } from "@/app/_providers/auth-provider";

// ThemeProvider goes outside AuthProvider: NeonAuthUIProvider wraps its own next-themes
// provider, which steps aside when one is already above it (same next-themes copy, see
// tests/app/_providers/providers.test.ts).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
