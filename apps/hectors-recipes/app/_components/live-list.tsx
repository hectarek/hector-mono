"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { listenToPlan } from "@/app/_lib/live-updates";

// Hears when this plan's grocery list changes (ux-plan D21) and reloads the page's data, so
// two people shopping see each other's changes within a second. The message only says
// "changed"; what's shown still comes through the page. AutoRefresh stays as the safety net
// for when this can't connect (no key, no signal, the service down).
export function LiveList({ planId }: { planId: string }) {
  const router = useRouter();

  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | undefined;

    // Adding a recipe is one message; a few quick check-offs are several. Refresh once, and
    // not while offline (Next.js answers a failed refresh with a full page load).
    const listener = listenToPlan(planId, () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        if (navigator.onLine) router.refresh();
      }, 300);
    });

    // iOS drops sockets in the background, and not always visibly: let go when hidden, and
    // reconnect when shown. AutoRefresh refreshes on showing, which catches what was missed.
    const onVisibility = () => {
      if (document.visibilityState === "visible") listener.resume();
      else listener.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisibility);
      listener.stop();
    };
  }, [planId, router]);

  return null;
}
