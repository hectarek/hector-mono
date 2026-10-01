"use client";

import { motion } from "framer-motion";
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from "@/src/lib/animations";
import type { Experience } from "@/src/types/portfolio";
import { ExperienceCard } from "./experience-card";

interface ExperienceTimelineProps {
  experiences: Experience[];
}

export function ExperienceTimeline({ experiences }: ExperienceTimelineProps) {
  return (
    <motion.div
      className="space-y-0"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={staggerContainer}
    >
      {experiences.map((experience) => (
        <motion.div
          key={`${experience.company}-${experience.role}-${experience.period}`}
          variants={staggerItem}
        >
          <ExperienceCard experience={experience} />
        </motion.div>
      ))}
    </motion.div>
  );
}
