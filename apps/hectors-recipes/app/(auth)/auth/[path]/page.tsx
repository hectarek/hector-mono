import { AuthView } from "@neondatabase/auth/react";
import { redirect } from "next/navigation";
import { BackLink } from "@/app/_components/back-link";
import { Logo } from "@/app/_components/logo";
import { skipsWhenSignedIn } from "@/app/_lib/auth-paths";
import { safeRedirect } from "@/app/_lib/safe-redirect";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

// Neon's wording, in the app's voice ("Sign in", not "Login").
const LOCALIZATION = {
  SIGN_IN: "Sign in",
  SIGN_IN_ACTION: "Sign in",
  SIGN_IN_DESCRIPTION: "Welcome back.",
  SIGN_UP: "Create account",
  SIGN_UP_ACTION: "Create account",
  SIGN_UP_DESCRIPTION: "Keep your recipes, plan the week and share groceries.",
};

// Full-screen like the welcome screen it comes from, not a card on a page. Neon's view
// takes class overrides for its card; these drop the card's frame and padding.
const CLASS_NAMES = {
  base: "border-0 bg-transparent py-0 shadow-none",
  header: "px-0",
  content: "px-0",
  footer: "px-0",
};

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path } = await params;
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  if (skipsWhenSignedIn(path)) {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      redirect(redirectTo);
    }
  }
  const welcomeHref =
    redirectTo === "/"
      ? "/welcome"
      : `/welcome?${new URLSearchParams({ redirectTo })}`;

  return (
    <main className="pt-safe-2 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <BackLink href={welcomeHref} label="Welcome" />
      <Logo className="h-5 w-auto self-start" />
      {/* The prop overrides the raw ?redirectTo= that AuthView would otherwise trust. */}
      <AuthView
        path={path}
        redirectTo={redirectTo}
        localization={LOCALIZATION}
        classNames={CLASS_NAMES}
        className="max-w-none"
      />
    </main>
  );
}
