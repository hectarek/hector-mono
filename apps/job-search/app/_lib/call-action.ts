import { unstable_isUnrecognizedActionError } from "next/navigation";
import { startTransition } from "react";
import type { ActionResult } from "@/app/actions/shared";

const RELOAD =
  "The app changed since this page loaded, and nothing was done. Reload the page and try again.";
const UNREACHABLE =
  "Couldn't reach the server. Check your connection and try again.";

// The one way a page tool calls its action (docs/build-plan.md KTD5), after recipes' callAction:
// inside a transition, as Next.js calls actions from code, answering the action's own envelope.
// An action never throws on its own, but its call can: a dropped connection, or a deploy since the
// page loaded that removed the action (`reload-needed`: nothing ran, so reloading and retrying is
// safe). Either way the tool gets an envelope, since a tool that throws reaches Claude only as
// "invocation failed".
export function callAction<T>(
  action: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return new Promise((resolve) => {
    startTransition(async () => {
      try {
        resolve(await action());
      } catch (err) {
        resolve(
          unstable_isUnrecognizedActionError(err)
            ? { ok: false, code: "reload-needed", message: RELOAD }
            : { ok: false, code: "unexpected", message: UNREACHABLE },
        );
      }
    });
  });
}
