"use client";

import { Button } from "@repo/ui/components/button";
import { m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { fadeInUp, viewportOptions } from "@/src/lib/animations";
import type { ExperienceData } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";
import { ExperienceTimeline } from "./experience-timeline";

interface ExperienceSectionProps {
  experience: ExperienceData;
  showCTA?: boolean;
  eyebrowIndex?: string;
  heading?: string;
  intro?: string;
}

export function ExperienceSection({
  experience,
  showCTA = false,
  eyebrowIndex = "05",
  heading = "Where I've built and shipped.",
  intro,
}: ExperienceSectionProps) {
  if (!experience?.experience || experience.experience.length === 0) {
    return null;
  }

  return (
    <m.section
      className="relative px-4 py-16 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index={eyebrowIndex} label="Experience" />

        <m.h2
          className="font-mono mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={fadeInUp}
        >
          {heading}
        </m.h2>
        {intro && (
          <m.p
            className="mt-3 max-w-2xl text-base text-muted-foreground"
            variants={fadeInUp}
          >
            {intro}
          </m.p>
        )}

        <div className="mt-10 max-w-4xl">
          <ExperienceTimeline experiences={experience.experience} />
        </div>

        {showCTA && (
          <m.div
            className="mt-8 max-w-4xl text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOptions}
          >
            <Button
              size="label"
              nativeButton={false}
              render={<Link href="/about" />}
              variant="outline"
            >
              See the full background
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </m.div>
        )}
      </div>
    </m.section>
  );
}
