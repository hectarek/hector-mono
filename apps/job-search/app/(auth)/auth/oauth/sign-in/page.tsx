import { OAuthSignIn } from "@/app/_components/oauth-sign-in";

// Where Neon sends Claude Code's sign-in to the MCP endpoint (docs/build-plan.md KTD22): Neon's
// OAuth server is set up with this page as its login page.
export default function OAuthSignInPage() {
  return (
    <main className="pt-safe-2 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <OAuthSignIn />
    </main>
  );
}
