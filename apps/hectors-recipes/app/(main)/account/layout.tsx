import { AuthProvider } from "@/app/_providers/auth-provider";

// Neon's sign-in kit loads only on the pages that draw its views (docs/ux-plan.md D102).
export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>;
}
