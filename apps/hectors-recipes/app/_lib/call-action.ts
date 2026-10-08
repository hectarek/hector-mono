import type { ActionState } from "@/app/actions/shared";

const UNREACHABLE =
  "Couldn't reach the server. Check your connection and try again.";

// For server actions called from a tap. A dropped connection (no signal in the store)
// throws instead of returning an error; report it the same way rather than letting it
// reach the error page.
export async function callAction(
  action: () => Promise<ActionState>,
): Promise<string | undefined> {
  try {
    return (await action())?.error;
  } catch {
    return UNREACHABLE;
  }
}

// The same for an action that returns what it did as well (`AddToListState`): its state, or a
// dropped connection as a failed one.
export async function callResultAction<State>(
  action: () => Promise<State>,
): Promise<State | { ok: false; error: string }> {
  try {
    return await action();
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}
