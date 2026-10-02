"use client";

import { motion } from "framer-motion";
import { ProjectsList } from "@/app/_components/portfolio/projects/projects-list";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import { fadeInUp, viewportOptions } from "@/src/lib/animations";
import type { Project } from "@/src/types/portfolio";

interface ProjectsPageContentProps {
  projects: Project[];
}

export function ProjectsPageContent({ projects }: ProjectsPageContentProps) {
  return (
    <motion.div
      className="relative px-4 py-14 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="relative mx-auto max-w-6xl">
        <motion.div variants={fadeInUp}>
          <SectionEyebrow index="P" label="Projects" />
        </motion.div>
        <motion.h1
          className="font-mono mt-6 text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
          variants={fadeInUp}
        >
          Selected work and case studies<span className="text-accent">.</span>
        </motion.h1>
        <motion.p
          className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={fadeInUp}
        >
          A production platform, an applied-AI pipeline, playable games, and the
          program I taught. Each card opens a case study with role, stack,
          screenshots, and outcomes.
        </motion.p>

        <div className="mt-14">
          <ProjectsList projects={projects} />
        </div>
      </div>
    </motion.div>
  );
}
