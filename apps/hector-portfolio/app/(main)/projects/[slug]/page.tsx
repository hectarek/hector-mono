import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/app/_components/portfolio/projects/project-detail";
import { getAllProjectSlugs, getProjectBySlug } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

// Only the projects in src/data are pages: any other slug is a real 404, not a 200 "not found".
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = getAllProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  // A 404 gets no canonical or og:url: there's no page to point to.
  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }

  return generateSEOMetadata({
    title: `${project.title} | Projects`,
    description: project.description,
    path: `/projects/${project.slug}`,
    keywords: project.technologies,
    type: "website",
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
