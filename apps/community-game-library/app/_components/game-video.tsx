"use client";

import { useState } from "react";
import { PlayIcon } from "@/app/_components/icons";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { videoEmbed } from "@/src/entities/video-link";

const FRAME =
  "flex h-37.5 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-foreground bg-secondary text-foreground hover:text-destructive";

// A game's how-to-play video (R7, B5's How to play), as recipes plays a recipe's: the player
// loads only when tapped, in the frame's place, and a host that won't play inside another site
// opens the video's own page instead. A hidden page keeps playing a video, so it closes when you
// leave. The catalog keeps no length, so the frame says what it is rather than B5's "12 min".
export function GameVideo({ link, title }: { link: string; title: string }) {
  const embed = videoEmbed(link);
  const [playing, setPlaying] = useState(false);
  useClosesOnLeave(() => setPlaying(false));

  if (playing && embed) {
    return (
      <iframe
        src={embed}
        title={`How to play ${title}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-md border-2 border-foreground"
      />
    );
  }
  const label = (
    <>
      <PlayIcon className="size-11" />
      <span className="font-mono text-xs font-medium">How-to-play video</span>
    </>
  );
  return embed ? (
    <button
      type="button"
      aria-label="Play the how-to-play video"
      onClick={() => setPlaying(true)}
      className={FRAME}
    >
      {label}
    </button>
  ) : (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Open the how-to-play video"
      className={FRAME}
    >
      {label}
    </a>
  );
}
