import type { Metadata } from "next";
import { getProjects } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";
import { ProjectsPageContent } from "./projects-page-content";

export const metadata: Metadata = generateSEOMetadata({
  title: "Projects | Hector Gonzalez",
  description:
    "Selected work: a production edtech platform with ~24K users, a nine-step AI curriculum pipeline, ten playable browser games, and a workforce program that placed 100+ graduates.",
  keywords: [
    "Projects",
    "Portfolio",
    "Next.js",
    "TypeScript",
    "Full Stack",
    "Web Development",
  ],
  path: "/projects",
  type: "website",
});

export default function ProjectsPage() {
  const projectsData = getProjects();

  return <ProjectsPageContent projects={projectsData.projects} />;
}
