"use client";

import { motion } from "framer-motion";
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
    <motion.section
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
          <motion.h2
            className="font-mono text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
            variants={fadeInUp}
          >
            What I work on,
            <br />
            and what I work with.
          </motion.h2>
          <motion.p
            className="max-w-xl text-base text-muted-foreground sm:text-lg"
            variants={fadeInUp}
          >
            Six capability areas that show up across most of my work, paired
            with the tools I actually reach for. The list is honest about depth
            &mdash; broad where it should be, sharper where it counts.
          </motion.p>
        </div>

        <motion.div
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {skills.categories.map((category, index) => (
            <motion.div key={category.name} variants={staggerItemScale}>
              <CapabilityCard category={category} index={index} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
