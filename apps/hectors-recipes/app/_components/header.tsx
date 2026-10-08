import { UserButton } from "@neondatabase/auth/react";
import Link from "next/link";
import { Logo } from "@/app/_components/logo";

export function Header() {
  return (
    // Stays still while a page moves (D89; app/globals.css).
    <header
      data-motion-name="site-header"
      className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 border-b backdrop-blur"
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" transitionTypes={["switch-tab"]}>
          <Logo className="h-5 w-auto" />
        </Link>
        <UserButton size="icon" />
      </div>
    </header>
  );
}
