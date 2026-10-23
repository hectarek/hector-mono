import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Bot } from "lucide-react";
import { Suspense } from "react";
import { getPageActor } from "@/app/_lib/current-actor";

// The part of the signed-in frame that depends on who's acting: Claude's banner (and, from
// U4, its page tools). It reads the session, so it streams in behind <Suspense> rather than
// holding up the layout, and it only decorates: each page's own getPageActor keeps other
// accounts out, as a layout doesn't stop its pages from rendering (docs/build-plan.md KTD2).
export function SessionChrome() {
  return (
    <Suspense>
      <ActorChrome />
    </Suspense>
  );
}

async function ActorChrome() {
  const { actor } = await getPageActor();
  if (actor !== "agent") {
    return null;
  }
  return (
    <Alert className="mb-4">
      <Bot />
      <AlertTitle>Claude&apos;s session</AlertTitle>
      <AlertDescription>
        Signed in as Claude. Some actions are only for Hector.
      </AlertDescription>
    </Alert>
  );
}
