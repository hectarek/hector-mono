import type { Metadata } from "next";
import { getProjects } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";
import { ProjectsPageContent } from "./projects-page-content";

export const metadata: Metadata = generateSEOMetadata({
  title: "Projects | Hector Gonzalez",
  description:
    "Explore my portfolio of projects - modern, scalable systems for learning and operations built with Next.js, TypeScript, and contemporary tech stacks.",
  keywords: [
    "Projects",
    "Portfolio",
    "Next.js",
    "TypeScript",
    "Full Stack",
    "Web Development",
  ],
  type: "website",
});

export default function ProjectsPage() {
  const projectsData = getProjects();

  return <ProjectsPageContent projects={projectsData.projects} />;
}
