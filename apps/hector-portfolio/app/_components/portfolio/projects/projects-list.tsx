"use client";

import { motion } from "framer-motion";
import {
  staggerContainer,
  staggerItemScale,
  viewportOptions,
} from "@/src/lib/animations";
import type { Project } from "@/src/types/portfolio";
import { ProjectCard } from "./project-card";

interface ProjectsListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No projects found.
      </div>
    );
  }

  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={staggerContainer}
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={staggerItemScale}>
          <ProjectCard project={project} />
        </motion.div>
      ))}
    </motion.div>
  );
}
