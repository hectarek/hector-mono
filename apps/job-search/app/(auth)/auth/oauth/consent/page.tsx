import { Suspense } from "react";
import { OAuthConsent } from "@/app/_components/oauth-consent";
import { getPageActor } from "@/app/_lib/current-actor";
import { UnauthenticatedError } from "@/src/entities/errors/common";

// Where Neon sends Claude Code's sign-in once someone is signed in (docs/build-plan.md KTD22):
// Neon's OAuth server is set up with this page as its consent page.
export default function OAuthConsentPage() {
  return (
    <main className="pt-safe-2 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <Suspense>
        <Consent />
      </Suspense>
    </main>
  );
}

// Who's signed in is known only at request time. Any account but the two goes to the private
// screen (getPageActor); signed out, the page says to start again.
async function Consent() {
  try {
    const { actor } = await getPageActor();
    return <OAuthConsent signedIn isClaude={actor === "agent"} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return <OAuthConsent signedIn={false} isClaude={false} />;
    }
    throw err;
  }
}
