"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshIfSaved, registerSavedCopies } from "@/app/_lib/saved-copy";

function sessionStore(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

// The phone's saved copies of pages (docs/ux-plan.md P31.2): registers the service worker, and
// brings a page it answered from its saved copy up to date. Renders nothing (D103).
export function SavedCopy() {
  const router = useRouter();
  useEffect(() => {
    refreshIfSaved({
      root: document.documentElement,
      online: navigator.onLine,
      storage: sessionStore(),
      now: Date.now(),
      page: `${location.pathname}${location.search}`,
      refresh: () => router.refresh(),
    });
    return registerSavedCopies();
  }, [router]);
  return null;
}
