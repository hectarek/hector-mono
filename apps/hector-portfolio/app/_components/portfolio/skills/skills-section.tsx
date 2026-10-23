"use client";

import { m } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItemScale,
  viewportOptions,
} from "@/src/lib/animations";
import type { SkillsData } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";
import { CapabilityCard } from "./capability-card";

interface SkillsSectionProps {
  skills: SkillsData;
  eyebrowIndex?: string;
}

export function SkillsSection({
  skills,
  eyebrowIndex = "03",
}: SkillsSectionProps) {
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

        <SectionEyebrow index={eyebrowIndex} label="Capabilities" />

        <m.h2
          className="font-mono mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={fadeInUp}
        >
          What I work on,
          <br />
          and what I work with.
        </m.h2>

        <m.div
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {skills.categories.map((category, index) => (
            <m.div key={category.name} variants={staggerItemScale}>
              <CapabilityCard category={category} index={index} />
            </m.div>
          ))}
        </m.div>
      </div>
    </m.section>
  );
}
