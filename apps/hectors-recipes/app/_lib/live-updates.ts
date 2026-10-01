import { GROCERY_LIST_CHANGED, planChannel } from "@/src/entities/realtime";

// The browser side of live updates (ux-plan D21). It's the only browser file that knows the
// provider (Ably): the browser has no DI container, so this module is the adapter and keeps
// a neutral name, and components only see `listenToPlan` (D28).
export type PlanListener = {
  // Drop the connection (the page is hidden) and pick it up again (shown).
  pause(): void;
  resume(): void;
  stop(): void;
};

// Calls onChange whenever the plan's grocery list changes. Starts paused when the page is
// hidden. A refused pass or a dropped connection just means no calls; the page's safety-net
// refresh covers it.
export function listenToPlan(
  planId: string,
  onChange: () => void,
): PlanListener {
  let wanted = document.visibilityState === "visible";
  let stopped = false;
  let client: import("ably").Realtime | undefined;

  // Loaded here, not in the page bundle: only the Groceries page listens.
  void import("ably").then(({ Realtime }) => {
    if (stopped) return;
    client = new Realtime({
      authUrl: `/api/realtime/token?plan=${planId}`,
      autoConnect: wanted,
    });
    client.channels
      .get(planChannel(planId))
      .subscribe(GROCERY_LIST_CHANGED, onChange)
      .catch(() => {});
  });

  return {
    pause() {
      wanted = false;
      client?.connection.close();
    },
    resume() {
      wanted = true;
      client?.connection.connect();
    },
    stop() {
      stopped = true;
      client?.close();
    },
  };
}
