"use client";

import { useEffect, useState } from "react";

export type WakeLockStatus = "pending" | "on" | "unsupported" | "denied";

// Keeps the screen on while mounted. Browsers release the lock whenever the page is
// hidden (tab switch, phone locked), so it's re-requested each time the page is visible
// again. Some browsers only grant it after the user has touched the page, so a refusal
// is retried on the next tap.
export function useWakeLock(): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("pending");

  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      setStatus("unsupported");
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    let cancelled = false;

    const request = async () => {
      // One request at a time: a second tap mid-request would otherwise orphan a lock
      // that never gets released.
      if (
        requesting ||
        document.visibilityState !== "visible" ||
        sentinel?.released === false
      )
        return;
      requesting = true;
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setStatus("on");
        sentinel.addEventListener("release", () => {
          if (!cancelled) setStatus("pending");
        });
      } catch {
        // Refused (e.g. low battery mode, or not allowed in this context).
        if (!cancelled) setStatus("denied");
      } finally {
        requesting = false;
      }
    };

    void request();
    document.addEventListener("visibilitychange", request);
    document.addEventListener("pointerdown", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      document.removeEventListener("pointerdown", request);
      void sentinel?.release();
    };
  }, []);

  return status;
}
