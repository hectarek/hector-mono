import { AccountView } from "@neondatabase/auth/react";
import { notFound } from "next/navigation";
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
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AccountView path={path} />
    </main>
  );
}
