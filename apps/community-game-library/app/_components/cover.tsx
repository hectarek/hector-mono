"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { type CoverColor, useCoverArt } from "@/app/_components/cover-thumb";

// The cover at the top of a game's page (the design system's Cover, Y1): a 148px bone block in a
// die-cut tile. Without art, the game's 54px token and its title in stencil are the cover; with
// art, the art at its own shape, and the page's title below carries the name. While the art
// loads, a dashed ring sits where the token goes; if it fails, the token shows as if there were
// no art. The page's h1 names the game, so only the stamp is read out.
export function Cover({
  title,
  color,
  imageUrl,
  stamp,
}: {
  title: string;
  color: CoverColor;
  imageUrl?: string | null;
  // The member's own status for the game, top right ("Available").
  stamp?: ReactNode;
}) {
  const { art, onLoad, onError } = useCoverArt(imageUrl);
  const token =
    "size-13.5 rounded-full border-2 border-dashed border-foreground outline-3 -outline-offset-8 outline-secondary";
  return (
    <div className="mx-1.5 mb-1 rounded-lg border-2 border-foreground bg-card outline-2 outline-offset-5 outline-foreground outline-dashed">
      <div className="relative flex h-37 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xs bg-secondary">
        {art === "loading" && <div aria-hidden="true" className={token} />}
        {(art === "none" || art === "failed") && (
          <>
            <div aria-hidden="true" data-color={color} className={token} />
            <p
              aria-hidden="true"
              className="px-3 text-center font-heading text-26 leading-none font-bold uppercase"
            >
              {title}
            </p>
          </>
        )}
        {imageUrl && (art === "loading" || art === "loaded") && (
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 768px) 600px, 100vw"
            onLoad={onLoad}
            onError={onError}
            className={
              art === "loaded"
                ? "object-contain py-2"
                : "object-contain py-2 opacity-0"
            }
          />
        )}
        {stamp && <div className="absolute top-3 right-3">{stamp}</div>}
      </div>
    </div>
  );
}
