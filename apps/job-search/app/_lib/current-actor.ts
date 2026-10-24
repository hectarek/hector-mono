import { redirect } from "next/navigation";
import { getInjection } from "@/di/container";
import { NotAllowedError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";

// Where an account that isn't one of the app's two lands (R23).
const PRIVATE_PATH = "/private";

// Pages, and the chrome around them: Hector's or Claude's session gets who's acting, and any
// other account goes to the private screen before the page reads anything. Each page calls
// it, as a layout doesn't stop its pages from rendering. No session throws
// UnauthenticatedError into app/error.tsx (the proxy sends signed-out visitors to the welcome
// screen before this runs), and so does a session that can't be read.
export async function getPageActor(): Promise<CurrentActor> {
  try {
    return await getInjection("IResolveActor")();
  } catch (err) {
    if (err instanceof NotAllowedError) {
      redirect(PRIVATE_PATH);
    }
    throw err;
  }
}

// Server actions: never redirects (docs/build-plan.md KTD4), so a page tool always gets an
// answer back. Throws UnauthenticatedError or NotAllowedError before the action runs a query;
// the action turns them into `unauthenticated` and `not-allowed`.
export async function getActionActor(): Promise<CurrentActor> {
  return getInjection("IResolveActor")();
}
