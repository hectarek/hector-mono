"use client";

import Image from "next/image";
import { useState } from "react";
import type { CoverColor } from "@/src/entities/piece";

// What a cover shows (Y1): the game's token until its art loads, the art once it does, and
// the token again if the art fails, so a cover never shows a broken picture or an empty box.
type Art = "none" | "loading" | "loaded" | "failed";

export function useCoverArt(imageUrl: string | null | undefined) {
  const [art, setArt] = useState<Art>(imageUrl ? "loading" : "none");
  return {
    art: imageUrl ? art : "none",
    onLoad: () => setArt("loaded"),
    onError: () => setArt("failed"),
  };
}

// The 22px punch token in a 52px bone square: a game in a list row, a sheet or a card. While
// the art loads, a dashed ring with no color sits where the token goes; the art is cropped to a
// square from its centre. The game's name is always beside it, so it's hidden from screen
// readers.
export function CoverThumb({
  color,
  imageUrl,
}: {
  color: CoverColor;
  imageUrl?: string | null;
}) {
  const { art, onLoad, onError } = useCoverArt(imageUrl);
  return (
    <span
      aria-hidden="true"
      className="relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-foreground bg-secondary"
    >
      {art === "loading" && (
        <span className="size-5.5 rounded-full outline-2 outline-offset-2 outline-foreground outline-dashed" />
      )}
      {(art === "none" || art === "failed") && (
        <span
          data-color={color}
          className="size-5.5 rounded-full outline-2 outline-offset-2 outline-foreground outline-dashed"
        />
      )}
      {imageUrl && (art === "loading" || art === "loaded") && (
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          sizes="48px"
          onLoad={onLoad}
          onError={onError}
          className={
            art === "loaded" ? "object-cover" : "object-cover opacity-0"
          }
        />
      )}
    </span>
  );
}
