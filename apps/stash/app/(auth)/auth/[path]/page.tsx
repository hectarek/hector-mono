import { AuthView } from "@neondatabase/auth/react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AUTH_PATHS, skipsWhenSignedIn } from "@/app/_lib/auth-paths";
import { auth } from "@/lib/auth/server";

export function generateStaticParams() {
  return AUTH_PATHS.map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  if (!AUTH_PATHS.includes(path)) {
    notFound();
  }

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <Suspense>
        <AuthForm path={path} />
      </Suspense>
    </main>
  );
}

// The session is read at request time, so the form waits behind it: someone already
// signed in goes back to the app without seeing it.
async function AuthForm({ path }: { path: string }) {
  if (skipsWhenSignedIn(path)) {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      redirect("/");
    }
  }

  return <AuthView path={path} />;
}
