"use client";

import { cn } from "@repo/ui/lib/utils";
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

// The square and its token: 52px with a 22px token in a list row, a sheet or a card; 32px with a
// 14px token, the copies counter's, in a 44px field and its list (a combobox's games).
const SIZES = {
  52: { square: "size-13", token: "size-5.5", art: "48px" },
  32: { square: "size-8", token: "size-3.5", art: "28px" },
} as const;

// The punch token in a bone square. While the art loads, a dashed ring with no color sits where
// the token goes; the art is cropped to a square from its centre. The game's name is always
// beside it, so it's hidden from screen readers. The token's ring and its colored disc are apart,
// so the disc can lift out of the ring as a copy is added (U26's token punch).
export function CoverThumb({
  color,
  imageUrl,
  size = 52,
}: {
  color: CoverColor;
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const { art, onLoad, onError } = useCoverArt(imageUrl);
  const { square, token, art: artSize } = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-foreground bg-secondary",
        square,
      )}
    >
      {art === "loading" && (
        <span
          className={cn(
            "rounded-full outline-2 outline-offset-2 outline-foreground outline-dashed",
            token,
          )}
        />
      )}
      {(art === "none" || art === "failed") && (
        <span
          data-token
          className={cn(
            "rounded-full outline-2 outline-offset-2 outline-foreground outline-dashed",
            token,
          )}
        >
          <span data-color={color} className="block size-full rounded-full" />
        </span>
      )}
      {imageUrl && (art === "loading" || art === "loaded") && (
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          sizes={artSize}
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
