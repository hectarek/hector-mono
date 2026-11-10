import { AccountView } from "@neondatabase/auth/react";
// The /react entry is a client module: its constants are only references on the server.
import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { LogOut } from "lucide-react";
import { notFound } from "next/navigation";
import { AppearanceCard } from "@/app/_components/appearance-card";
import { BackLink } from "@/app/_components/back-link";
import { ACCOUNT_PATHS, SIGN_OUT_HREF } from "@/app/_lib/auth-paths";

export function generateStaticParams() {
  return ACCOUNT_PATHS.map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  if (!ACCOUNT_PATHS.includes(path)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* The account menu opens from any tab, so this goes home rather than guessing. */}
      <BackLink href="/" label="Recipes" />
      <AccountView path={path} />
      {path === accountViewPaths.SETTINGS && (
        // AccountView has no slot for extra cards. From md up, match its nav column
        // (w-48 lg:w-60, gap-12) so this card lines up under its cards.
        <div className="flex md:gap-12">
          <div className="hidden w-48 shrink-0 md:block lg:w-60" />
          <div className="flex w-full flex-col gap-4 md:gap-6">
            <AppearanceCard />
            {/* Sign out lives here now that the header's button is a link (D102). A plain
                link, so it loads the whole page as Neon's own links do and is never
                prefetched; the sign-out page ends the session. */}
            <Button
              variant="secondary"
              size="lg"
              nativeButton={false}
              render={<a href={SIGN_OUT_HREF} />}
            >
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
