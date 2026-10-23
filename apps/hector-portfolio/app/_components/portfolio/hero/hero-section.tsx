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
      className="relative overflow-hidden px-4 pb-16 pt-8 sm:pb-20 sm:pt-12"
      // Rendered visible from the first paint: the name and photo are the page's
      // largest content, and fading them in from opacity 0 delayed LCP until hydration.
      initial={false}
      animate="visible"
      variants={heroVariants}
    >
      <div className="relative mx-auto max-w-6xl">
        <m.div variants={heroItem}>
          <SectionEyebrow index="01" label="Summary" />
        </m.div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <m.h1
              className="font-mono text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-tight text-foreground"
              variants={heroItem}
            >
              Hector
              <br />
              Gonzalez<span className="text-accent">.</span>
            </m.h1>

            {/* Every part carries a leading "·", and the clipped negative margin hides the
                one that starts each line, so a wrapped title never ends a line on a dot */}
            <m.p
              className="overflow-hidden font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground sm:text-sm"
              variants={heroItem}
            >
              <span className="-ml-[1.6em] flex flex-wrap">
                {profile.title.split(" · ").map((part) => (
                  <span
                    key={part}
                    className="whitespace-nowrap before:inline-block before:w-[1.6em] before:text-center before:content-['·']"
                  >
                    {part}
                  </span>
                ))}
              </span>
            </m.p>

            {profile.tagline && (
              <m.p
                className="font-serif max-w-2xl pt-3 text-xl leading-snug text-balance text-foreground sm:text-2xl lg:my-auto lg:pt-0 lg:text-3xl"
                variants={heroItem}
              >
                <span className="italic">{profile.tagline}</span>
              </m.p>
            )}

            {/* On large screens the column is as tall as the photo: the line's auto margins
                center it between the title and the buttons, which end at the photo's bottom edge */}
            <m.div
              className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center lg:pt-0"
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
