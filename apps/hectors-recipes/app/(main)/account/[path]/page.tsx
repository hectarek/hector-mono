import { AccountView } from "@neondatabase/auth/react";
// The /react entry is a client module: its constants are only references on the server.
import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import { notFound } from "next/navigation";
import { AppearanceCard } from "@/app/_components/appearance-card";
import { BackLink } from "@/app/_components/back-link";
import { ACCOUNT_PATHS } from "@/app/_lib/auth-paths";

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
          <AppearanceCard />
        </div>
      )}
    </div>
  );
}
