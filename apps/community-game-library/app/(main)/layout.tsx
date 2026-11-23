import { Suspense } from "react";
import { AppBar, ShellTabBar } from "@/app/_components/app-header";
import { LeaveGuardDialog } from "@/app/_components/confirm-dialog";
import { NoConnection } from "@/app/_components/no-connection";
import { SavedCopy } from "@/app/_components/saved-copy";
import { AccountGate } from "./account-gate";

// The signed-in shell (D14, KTD14): on a phone, each page's own header (AppHeader), the page, and
// the four tabs at the bottom; from 768px, the bar with the app's name, the tabs, the bell and
// the member's piece across the top, and no bottom bar. Pages lay themselves out in a
// PageColumn. The gate after sign-in (AccountGate) sits beside the page, not around it, so the shell
// and each page's skeleton still prerender whole. The piece in the header is the member's own
// (YouLink), and the tabs and the bell show their counts (U11). SavedCopy keeps the phone's copy
// of each page read, and brings a page shown from its copy up to date (KTD19, U23).
export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NoConnection />
      <Suspense fallback={null}>
        <AccountGate />
      </Suspense>
      <AppBar />
      <main className="flex flex-1 flex-col">{children}</main>
      <ShellTabBar placement="bottom" />
      <LeaveGuardDialog />
      <SavedCopy />
    </div>
  );
}
