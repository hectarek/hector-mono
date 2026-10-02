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

        <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-end">
          <m.h2
            className="font-mono text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
            variants={fadeInUp}
          >
            What I work on,
            <br />
            and what I work with.
          </m.h2>
          <m.p
            className="max-w-xl text-base text-muted-foreground sm:text-lg"
            variants={fadeInUp}
          >
            Front-end product engineering is the depth, applied AI is the
            specialty, and the rest of the stack is the breadth that lets me own
            a product on my own. These are the tools I actually reach for.
          </m.p>
        </div>

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
