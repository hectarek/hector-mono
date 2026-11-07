import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@repo/ui/components/sidebar";
import { Toaster } from "@repo/ui/components/sonner";
import { LogOut } from "lucide-react";
import Link from "next/link";
import {
  MainNav,
  MenuClose,
  TabTitle,
  TopBar,
} from "@/app/_components/app-nav";
import { DisplayLabel } from "@/app/_components/display";

// The signed-in frame (docs/build-plan.md KTD19, the design system's AppShell): a sidebar on
// desktop, an off-canvas sheet opened from the top bar on phones, and the top bar, which stays
// put as the page scrolls. The sections, how the current one is marked and the tab's title are in
// app-nav.tsx; Sign out stands apart at the foot, so it isn't tapped for the section above it.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TabTitle />
      <Sidebar>
        <SidebarHeader>
          <DisplayLabel className="px-2 py-1.5">Job search</DisplayLabel>
          <MenuClose />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <MainNav />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href={`/auth/${authViewPaths.SIGN_OUT}`} />}
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <TopBar />
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
      {/* What a save changed, with Undo where it can be taken back; its live region reads each
          one out (the UX plan's UX3). */}
      <Toaster position="bottom-center" />
    </SidebarProvider>
  );
}
