import type { Metadata } from "next";
import { getProjects } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";
import { ProjectsPageContent } from "./projects-page-content";

export const metadata: Metadata = generateSEOMetadata({
  title: "Projects | Hector Gonzalez",
  description:
    "A learning platform tens of thousands of people use, an AI pipeline that cuts lesson time by 95%+, 10+ games built solo, and 100+ graduates placed.",
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
