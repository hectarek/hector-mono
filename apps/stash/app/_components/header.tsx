import { UserButton } from "@neondatabase/auth/react";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">Stash</span>
        <span className="text-muted-foreground text-xs">beta</span>
      </div>
      <UserButton size="icon" />
    </header>
  );
}
