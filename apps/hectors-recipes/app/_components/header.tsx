import { Button } from "@repo/ui/components/button";
import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { ACCOUNT_HREF } from "@/app/_lib/auth-paths";

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
        {/* A plain link, not Neon's menu, so Neon's sign-in kit stays off every other page
            (D102). Not prefetched: the account page is rare, and it's where the kit loads. */}
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label="Account"
          nativeButton={false}
          render={<Link href={ACCOUNT_HREF} prefetch={false} />}
        >
          <CircleUserRound />
        </Button>
      </div>
    </header>
  );
}
