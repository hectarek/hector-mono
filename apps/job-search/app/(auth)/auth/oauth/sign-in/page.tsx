import { Suspense } from "react";
import { OAuthSignIn } from "@/app/_components/oauth-sign-in";
import { getPageActor } from "@/app/_lib/current-actor";
import { UnauthenticatedError } from "@/src/entities/errors/common";

// Where Neon sends Claude Code's sign-in to the MCP endpoint (docs/build-plan.md KTD22): Neon's
// OAuth server is set up with this page as its login page.
export default function OAuthSignInPage() {
  return (
    <main className="pt-safe-2 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}

// Who's signed in is known only at request time. Any account but the two goes to the private screen
// (getPageActor); signed out, the page shows its form.
async function SignIn() {
  try {
    const { actor } = await getPageActor();
    return <OAuthSignIn signedIn={actor === "agent" ? "claude" : "hector"} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return <OAuthSignIn signedIn="no-one" />;
    }
    throw err;
  }
}
