"use client";

import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useState } from "react";
import { ShareIcon } from "@/app/_components/icons";
import { Steps } from "@/app/_components/steps";

const PLATFORMS = ["iPhone", "Android"] as const;
type Platform = (typeof PLATFORMS)[number];

// A6's steps, one list for iPhone and one for Android (R43): Safari's Share and Add to Home
// Screen, and Chrome's menu and Install app. The manifest and the install prompt come with U23.
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

export function HomeScreenSteps() {
  const [platform, setPlatform] = useState<Platform>("iPhone");
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
      <Steps steps={STEPS[platform]} />
      <p className="text-13 leading-snug text-muted-foreground">
        It opens full screen, like any other app.
      </p>
    </>
  );
}
