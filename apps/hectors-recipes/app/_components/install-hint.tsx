"use client";

import { Button } from "@repo/ui/components/button";
import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "install-hint-dismissed";

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

// Safari never offers to install a web app, so point iPhone users at Share → Add to Home Screen.
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Storage blocked (private mode): just show it.
    }
    setShow(isIos() && !isInstalled() && !dismissed);
  }, []);

  if (!show) {
    return null;
  }

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to persist; it stays hidden for this visit.
    }
  }

  return (
    <div
      role="note"
      className="bg-muted mb-4 flex items-start gap-3 rounded-xl p-3 text-sm"
    >
      <p className="flex-1 leading-snug">
        Use this like an app: tap{" "}
        <Share className="inline size-4 align-text-bottom" aria-label="Share" />{" "}
        then <strong>Add to Home Screen</strong>.
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}
