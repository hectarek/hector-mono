"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetches the page's server data every so often while it's on screen, and on coming back
// to it. On Groceries it's the safety net under LiveList, for when live updates can't
// connect.
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    // With no signal a refresh can't load, and Next.js answers a failed one with a full
    // page load, which would land on the browser's offline page mid-shop. So it waits, and
    // the "online" event refreshes as soon as the signal is back.
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        router.refresh();
      }
    };
    const timer = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
