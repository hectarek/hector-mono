"use client";

import { Button } from "@repo/ui/components/button";
import { m } from "framer-motion";
import { ArrowDown, Mail } from "lucide-react";
import Link from "next/link";
import { heroItem, heroVariants } from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";
import { HeroImage } from "./hero-image";

interface HeroSectionProps {
  profile: Profile;
}

export function HeroSection({ profile }: HeroSectionProps) {
  return (
    <m.section
      id="top"
      className="relative overflow-hidden px-4 pb-10 pt-8 sm:pt-12"
      // Rendered visible from the first paint: the bio and photo are the page's
      // largest content, and fading them in from opacity 0 delayed LCP until hydration.
      initial={false}
      animate="visible"
      variants={heroVariants}
    >
      <div className="relative mx-auto max-w-6xl">
        <m.div variants={heroItem}>
          <SectionEyebrow index="01" label="Hector Gonzalez · Portfolio" />
        </m.div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="space-y-5 lg:col-span-7">
            <m.h1
              className="font-mono text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-tight text-foreground"
              variants={heroItem}
            >
              Hector
              <br />
              Gonzalez<span className="text-accent">.</span>
            </m.h1>

            <m.p
              className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground sm:text-sm"
              variants={heroItem}
            >
              {profile.title}
            </m.p>

            {profile.tagline && (
              <m.p
                className="font-serif max-w-2xl text-xl leading-snug text-foreground sm:text-2xl"
                variants={heroItem}
              >
                <span className="italic">{profile.tagline}</span>
              </m.p>
            )}

            <m.p
              className="max-w-2xl text-base leading-relaxed text-muted-foreground"
              variants={heroItem}
            >
              {profile.bio}
            </m.p>

            <m.div
              className="flex flex-wrap items-center gap-3 pt-2"
              variants={heroItem}
            >
              <Button
                size="label"
                nativeButton={false}
                render={<Link href="#work" />}
              >
                See selected work
                <ArrowDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              <Button
                size="label"
                nativeButton={false}
                render={<Link href={`mailto:${profile.email}`} />}
                variant="outline"
              >
                <Mail className="mr-2 h-3.5 w-3.5" />
                Get in touch
              </Button>
              <Link
                href="/now"
                className="group inline-flex items-baseline gap-1.5 px-1 text-muted-foreground transition-colors hover:text-accent"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
                  What I&apos;m working on
                </span>
                <span
                  data-font="hand"
                  className="text-xl leading-none text-accent"
                >
                  now
                </span>
                <span
                  aria-hidden
                  className="font-mono text-[11px] uppercase tracking-[0.22em] transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </m.div>
          </div>

          <m.div className="lg:col-span-5" variants={heroItem}>
            <HeroImage profile={profile} />
          </m.div>
        </div>
      </div>
    </m.section>
  );
}
