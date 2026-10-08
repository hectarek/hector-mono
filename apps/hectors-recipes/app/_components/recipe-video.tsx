"use client";

import { Button } from "@repo/ui/components/button";
import { ExternalLink, Play } from "lucide-react";
import { type ReactNode, useState } from "react";
import { videoEmbed } from "@/src/entities/video-link";

// A recipe's video in the photo's place (docs/ux-plan.md D81): the photo, or its tile, with a
// play button, and the player loads only when tapped. A host that won't play inside another
// site opens the video's own page instead.
export function RecipeVideo({
  link,
  title,
  children,
}: {
  link: string;
  title: string;
  children: ReactNode;
}) {
  const embed = videoEmbed(link);
  const [playing, setPlaying] = useState(false);

  if (playing && embed) {
    return (
      <iframe
        src={embed}
        title={`Video: ${title}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-xl"
      />
    );
  }
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 flex items-center justify-center">
        {embed ? (
          <Button size="lg" onClick={() => setPlaying(true)}>
            <Play data-icon="inline-start" />
            Play video
          </Button>
        ) : (
          <Button
            size="lg"
            nativeButton={false}
            render={<a href={link} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink data-icon="inline-start" />
            Watch video
          </Button>
        )}
      </div>
    </div>
  );
}
