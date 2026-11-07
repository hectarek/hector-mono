import type { Metadata } from "next";
import { AppShell } from "@/app/_components/app-shell";
import { SessionChrome } from "@/app/_components/session-chrome";

// The shell renders each signed-in page's title (TabTitle in app-nav.tsx), so these pages take none
// from metadata: a second title would leave the browser to pick one.
export const metadata: Metadata = { title: null };

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
