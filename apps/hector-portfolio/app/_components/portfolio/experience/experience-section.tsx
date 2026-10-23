"use client";

import { m } from "framer-motion";
import { fadeInUp, viewportOptions } from "@/src/lib/animations";
import type { ExperienceData } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";
import { ExperienceTimeline } from "./experience-timeline";

interface ExperienceSectionProps {
  experience: ExperienceData;
  eyebrowIndex: string;
  heading: string;
  intro?: string;
}

export function ExperienceSection({
  experience,
  eyebrowIndex,
  heading,
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
      </div>
    </m.section>
  );
}
