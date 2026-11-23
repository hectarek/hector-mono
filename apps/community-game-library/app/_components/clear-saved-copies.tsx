"use client";

import { useEffect } from "react";
import { clearSavedPages } from "@/app/_lib/saved-copy";

// On the ways out of the signed-in app, the welcome and removed pages: the phone's saved pages go,
// however the page was reached (KTD19). Renders nothing.
export function ClearSavedCopies() {
  useEffect(() => {
    void clearSavedPages(typeof caches === "undefined" ? undefined : caches);
  }, []);
  return null;
}
