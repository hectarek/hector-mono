"use client";

import { Button } from "@repo/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useEffect, useState } from "react";
import { ShareIcon } from "@/app/_components/icons";
import { Steps } from "@/app/_components/steps";

const PLATFORMS = ["iPhone", "Android"] as const;
type Platform = (typeof PLATFORMS)[number];

// A6's steps, one list for iPhone and one for Android (R43): Safari's Share and Add to Home
// Screen, and Chrome's menu and Install app. When Chrome offers its own install prompt
// (beforeinstallprompt, Android), Android's choice is a button that opens it (U23).
const STEPS: Record<Platform, { id: string; text: React.ReactNode }[]> = {
  iPhone: [
    {
      id: "share",
      text: (
        <>
          Tap Share <ShareIcon className="inline size-4.5 align-text-bottom" />{" "}
          in Safari
        </>
      ),
    },
    { id: "add", text: "Choose Add to Home Screen" },
    { id: "open", text: "Open Community Game Library from your home screen" },
  ],
  Android: [
    { id: "menu", text: "Tap the menu (⋮) in Chrome" },
    { id: "install", text: "Choose Install app or Add to Home screen" },
    { id: "open", text: "Open Community Game Library from your home screen" },
  ],
};

// The event Chrome fires when it would install the app: its prompt opens the install dialog.
type InstallPrompt = Event & { prompt(): Promise<unknown> };

function isInstallPrompt(event: Event): event is InstallPrompt {
  return "prompt" in event && typeof event.prompt === "function";
}

export function HomeScreenSteps() {
  const [platform, setPlatform] = useState<Platform>("iPhone");
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    function offered(event: Event) {
      if (!isInstallPrompt(event)) return;
      // Kept for the button, rather than shown by Chrome on its own.
      event.preventDefault();
      setInstall(event);
      setPlatform("Android");
    }
    window.addEventListener("beforeinstallprompt", offered);
    return () => window.removeEventListener("beforeinstallprompt", offered);
  }, []);
  return (
    <>
      <ToggleGroup
        value={[platform]}
        onValueChange={(value) => {
          const next = PLATFORMS.find((one) => one === value[0]);
          if (next) setPlatform(next);
        }}
        spacing={0}
        aria-label="Your phone"
        className="w-full"
      >
        {PLATFORMS.map((one) => (
          <ToggleGroupItem key={one} value={one} className="flex-1">
            {one}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {platform === "Android" && install ? (
        <Button
          size="lg"
          onClick={() => {
            void install.prompt().finally(() => setInstall(null));
          }}
        >
          Install the app
        </Button>
      ) : (
        <Steps steps={STEPS[platform]} />
      )}
      <p className="text-13 leading-snug text-muted-foreground">
        It opens full screen, like any other app.
      </p>
    </>
  );
}
