import { AppBar } from "@/app/_components/app-header";
import { LeaveGuardDialog } from "@/app/_components/confirm-dialog";
import { NoConnection } from "@/app/_components/no-connection";
import { TabBar } from "@/app/_components/tab-bar";

// The signed-in shell (D14, KTD14): on a phone, each page's own header (AppHeader), the page, and
// the four tabs at the bottom; from 768px, the bar with the app's name, the tabs, the bell and
// the member's piece across the top, and no bottom bar. Pages lay themselves out in a
// PageColumn. U5 gives the bell and the piece the member's own, and U11 the tabs their counts.
export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NoConnection />
      <AppBar />
      <main className="flex flex-1 flex-col">{children}</main>
      <TabBar placement="bottom" />
      <LeaveGuardDialog />
    </div>
  );
}
