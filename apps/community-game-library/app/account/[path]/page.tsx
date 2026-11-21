import { AccountView } from "@neondatabase/auth/react";
import { notFound } from "next/navigation";
import { BackLink } from "@/app/_components/back-link";
import { ACCOUNT_PATHS } from "@/app/_lib/auth-paths";

export function generateStaticParams() {
  return ACCOUNT_PATHS.map((path) => ({ path }));
}

// Neon's account views (email, password, sessions), which the sign-in kit draws, so they sit
// under the kit's own layout (KTD2), not the signed-in shell's.
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
    <main className="mx-auto flex w-full max-w-168 flex-col gap-4 px-4 pb-6">
      <BackLink href="/you" label="You" />
      <AccountView path={path} />
    </main>
  );
}
