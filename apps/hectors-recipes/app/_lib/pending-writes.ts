import { z } from "zod";
import type { ActionState } from "@/app/actions/shared";

// Grocery taps made with no signal (a store's back aisle), kept until they can be sent.
// Each one sets a value ("checked = true", "removed"), never flips one, so sending it
// late or twice gives the same result.
const pendingWriteSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("check"),
    itemId: z.string(),
    checked: z.boolean(),
  }),
  z.object({ kind: z.literal("remove"), itemId: z.string() }),
]);
export type PendingWrite = z.infer<typeof pendingWriteSchema>;

export type WriteOutcome = "saved" | "offline" | { error: string };

// Only the latest tap on an item matters.
export function enqueue(
  queue: PendingWrite[],
  write: PendingWrite,
): PendingWrite[] {
  return [...queue.filter((queued) => queued.itemId !== write.itemId), write];
}

function sameWrite(a: PendingWrite, b: PendingWrite): boolean {
  if (a.itemId !== b.itemId || a.kind !== b.kind) return false;
  return a.kind === "remove" || (b.kind === "check" && a.checked === b.checked);
}

// Drops a write that has been sent, unless the item was tapped again in the meantime.
export function settle(
  queue: PendingWrite[],
  write: PendingWrite,
): PendingWrite[] {
  return queue.filter((queued) => !sameWrite(queued, write));
}

// The queue as saved in the browser; anything unreadable is dropped rather than retried.
export function parseQueue(raw: string | null): PendingWrite[] {
  try {
    const parsed = z
      .array(pendingWriteSchema)
      .safeParse(JSON.parse(raw ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

// Sends one write. "offline" means it never reached the server (keep it for later);
// an error means the server answered and said no (retrying won't help).
export async function attempt(
  send: () => Promise<ActionState>,
  online: boolean,
): Promise<WriteOutcome> {
  if (!online) {
    return "offline";
  }
  try {
    const state = await send();
    return state?.error ? { error: state.error } : "saved";
  } catch {
    return "offline";
  }
}
