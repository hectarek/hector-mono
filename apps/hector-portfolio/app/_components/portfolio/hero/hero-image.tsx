"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { scaleIn } from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";

interface HeroImageProps {
  profile: Profile;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export function HeroImage({ profile }: HeroImageProps) {
  return (
    <motion.figure
      className="relative mx-auto w-full max-w-[260px] sm:max-w-[280px] lg:mx-0 lg:max-w-[320px]"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-muted">
        {profile.image ? (
          <Image
            src={profile.image}
            alt={`${profile.name} portrait`}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 640px) 260px, (max-width: 1024px) 280px, 320px"
          />
        ) : (
          <div
            data-texture="dot-grid"
            className="flex h-full w-full items-center justify-center"
          >
            <span className="font-mono text-6xl font-medium text-muted-foreground sm:text-7xl">
              {getInitials(profile.name)}
            </span>
          </div>
        )}
      </div>

      <figcaption className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
        <span>{profile.location ?? "—"}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className="relative flex h-1.5 w-1.5 items-center justify-center"
            aria-hidden
          >
            <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-accent/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Building
        </span>
      </figcaption>
    </motion.figure>
  );
}
