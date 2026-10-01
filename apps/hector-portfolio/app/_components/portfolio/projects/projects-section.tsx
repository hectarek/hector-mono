"use client";

import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItemScale,
} from "@/src/lib/animations";
import { useScrollReveal } from "@/src/lib/use-scroll-reveal";
import type { Project } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";
import { ProjectCard } from "./project-card";

interface ProjectsSectionProps {
  projects: Project[];
  eyebrowIndex?: string;
}

export function ProjectsSection({
  projects,
  eyebrowIndex = "04",
}: ProjectsSectionProps) {
  const scrollReveal = useScrollReveal();

  return (
    <motion.section
      id="work"
      className="relative px-4 py-16 sm:py-20"
      {...scrollReveal}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index={eyebrowIndex} label="Selected work" />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <motion.h2
            className="font-mono max-w-3xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
            variants={fadeInUp}
          >
            Production systems, applied AI,
            <br className="hidden sm:block" />
            and tools people actually use.
          </motion.h2>
          <motion.a
            href="/projects"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-accent"
            variants={fadeInUp}
          >
            All projects
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </motion.a>
        </div>

        <motion.div
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={staggerItemScale}>
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
