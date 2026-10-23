import { AppShell } from "@/app/_components/app-shell";
import { SessionChrome } from "@/app/_components/session-chrome";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell>
      <SessionChrome />
      {children}
    </AppShell>
  );
}
