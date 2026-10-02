import { getCurrentUserId } from "@/app/_lib/current-user";
import { getInjection } from "@/di/container";
import {
  InputParseError,
  LiveUpdatesOffError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

// Ably's authUrl (ux-plan D21): a browser's pass to hear when one plan's grocery list
// changes. The proxy skips /api, so the controller's session check is the gate. Ably's
// client stops retrying on a 403 (spec RSA4d) and retries anything else, so a refusal is
// 403 and only signing in again or a server error is worth retrying. With no key, live updates
// are off: that's a 403 too, so the browser stops asking and the page refreshes instead.
export async function GET(request: Request): Promise<Response> {
  const planId = new URL(request.url).searchParams.get("plan") ?? undefined;
  try {
    const grant = await getInjection("IGrantPlanSubscriptionController")(
      { planId },
      await getCurrentUserId(),
    );
    return Response.json(grant, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return new Response("Sign in again", { status: 401 });
    }
    if (
      err instanceof InputParseError ||
      err instanceof NotFoundError ||
      err instanceof UnauthorizedError
    ) {
      return new Response("Not allowed", { status: 403 });
    }
    if (err instanceof LiveUpdatesOffError) {
      return new Response("Live updates are off", { status: 403 });
    }
    getInjection("ILoggerService")
      .child({ layer: "route", op: "realtimeToken" })
      .error("Failed to grant a subscription", {
        planId,
        error: err instanceof Error ? err.message : String(err),
      });
    return new Response("Couldn't get a pass", { status: 500 });
  }
}
