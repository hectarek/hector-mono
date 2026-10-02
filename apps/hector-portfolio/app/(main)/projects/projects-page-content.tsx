"use client";

import { m } from "framer-motion";
import { ProjectsList } from "@/app/_components/portfolio/projects/projects-list";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import { fadeInUp, viewportOptions } from "@/src/lib/animations";
import type { Project } from "@/src/types/portfolio";

interface ProjectsPageContentProps {
  projects: Project[];
}

export function ProjectsPageContent({ projects }: ProjectsPageContentProps) {
  return (
    <m.div
      className="relative px-4 py-14 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="relative mx-auto max-w-6xl">
        <m.div variants={fadeInUp}>
          <SectionEyebrow index="P" label="Projects" />
        </m.div>
        <m.h1
          className="font-mono mt-6 text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
          variants={fadeInUp}
        >
          Selected work and case studies<span className="text-accent">.</span>
        </m.h1>
        <m.p
          className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={fadeInUp}
        >
          A production platform, an applied-AI pipeline, playable games, and the
          program I taught. Each card opens a case study with role, stack,
          screenshots, and outcomes.
        </m.p>

        <div className="mt-14">
          <ProjectsList projects={projects} />
        </div>
      </div>
    </m.div>
  );
}
