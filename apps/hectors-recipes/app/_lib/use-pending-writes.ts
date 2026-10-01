"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  attempt,
  enqueue,
  type PendingWrite,
  parseQueue,
  settle,
} from "@/app/_lib/pending-writes";
import {
  removeGroceryItem,
  setGroceryItemChecked,
} from "@/app/actions/grocery";

const storageKey = (listId: string) => `grocery-pending:${listId}`;

function load(listId: string): PendingWrite[] {
  try {
    return parseQueue(localStorage.getItem(storageKey(listId)));
  } catch {
    return [];
  }
}

function save(listId: string, queue: PendingWrite[]): void {
  try {
    if (queue.length) {
      localStorage.setItem(storageKey(listId), JSON.stringify(queue));
    } else {
      localStorage.removeItem(storageKey(listId));
    }
  } catch {
    // Storage blocked (private mode): the queue lasts as long as the page does.
  }
}

function send(write: PendingWrite) {
  return write.kind === "check"
    ? setGroceryItemChecked(write.itemId, write.checked)
    : removeGroceryItem(write.itemId);
}

// Grocery taps that couldn't reach the server, kept in this browser and sent again when the
// signal comes back (or the page is looked at again). `queue` lets the list show those taps
// as done; `run` sends a tap now or queues it, and returns the server's error if it said no.
export function usePendingWrites(listId: string) {
  const router = useRouter();
  const [queue, setQueue] = useState<PendingWrite[]>([]);
  // The retry loop runs outside render, so it reads the latest queue from here.
  const queueRef = useRef(queue);

  const update = useCallback(
    (change: (queue: PendingWrite[]) => PendingWrite[]) => {
      const next = change(queueRef.current);
      queueRef.current = next;
      save(listId, next);
      setQueue(next);
    },
    [listId],
  );

  const run = useCallback(
    async (write: PendingWrite): Promise<string | undefined> => {
      const outcome = await attempt(() => send(write), navigator.onLine);
      if (outcome === "offline") {
        update((queue) => enqueue(queue, write));
        return undefined;
      }
      // It reached the server, so any older tap still queued for this item is out of date.
      update((queue) =>
        queue.filter((queued) => queued.itemId !== write.itemId),
      );
      return outcome === "saved" ? undefined : outcome.error;
    },
    [update],
  );

  useEffect(() => {
    // Loaded after mount: the server can't see this browser's storage.
    queueRef.current = load(listId);
    setQueue(queueRef.current);

    let flushing = false;
    const flush = async () => {
      if (
        flushing ||
        document.visibilityState !== "visible" ||
        !queueRef.current.length
      ) {
        return;
      }
      flushing = true;
      let sent = false;
      for (const write of queueRef.current) {
        const outcome = await attempt(() => send(write), navigator.onLine);
        if (outcome === "offline") break;
        // Saved, or the server said no (someone removed the item meanwhile): done either way.
        update((queue) => settle(queue, write));
        sent = true;
      }
      flushing = false;
      if (sent) router.refresh();
    };

    void flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [listId, update, router]);

  return { queue, run };
}
