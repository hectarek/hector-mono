import { AuthView } from "@neondatabase/auth/react";
import { redirect } from "next/navigation";
import { skipsWhenSignedIn } from "@/app/_lib/auth-paths";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  if (skipsWhenSignedIn(path)) {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      redirect("/");
    }
  }

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView path={path} />
    </main>
  );
}
