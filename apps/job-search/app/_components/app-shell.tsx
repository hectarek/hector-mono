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
  SidebarTrigger,
} from "@repo/ui/components/sidebar";
import { Bot, Building2, CalendarDays, LogOut, Settings } from "lucide-react";
import Link from "next/link";

// The signed-in frame (docs/build-plan.md KTD19): a sidebar on desktop, an off-canvas sheet
// opened from the header on phones. Each unit adds its section to the menu as it ships.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 py-1.5 text-sm font-semibold">Job search</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" render={<Link href="/" />}>
                    <CalendarDays />
                    <span>This week</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    render={<Link href="/companies" />}
                  >
                    <Building2 />
                    <span>Companies</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" render={<Link href="/agent" />}>
                    <Bot />
                    <span>Claude</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/settings" />}>
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger size="icon-lg" className="min-h-11 min-w-11" />
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
