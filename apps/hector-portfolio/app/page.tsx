import type { Metadata } from "next";
import { ApproachSection } from "@/app/_components/portfolio/approach/approach-section";
import { ContactCTA } from "@/app/_components/portfolio/contact/contact-cta";
import { HeroSection } from "@/app/_components/portfolio/hero/hero-section";
import { PathSection } from "@/app/_components/portfolio/path/path-section";
import { ProjectsSection } from "@/app/_components/portfolio/projects/projects-section";
import { ProofStrip } from "@/app/_components/portfolio/proof/proof-strip";
import { getFeaturedProjects, getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Hector Gonzalez | Full-Stack Engineer, Front End and Applied AI",
  description:
    "I build software that makes someone's work easier. Six years building for the web, from a bank's public site to a learning platform for North Carolina high schoolers.",
  keywords: [
    "Hector Gonzalez",
    "Full-Stack Engineer",
    "Front-End Engineer",
    "Applied AI",
    "AI Engineer",
    "React",
    "Next.js",
    "TypeScript",
    "Charlotte",
    "EdTech",
  ],
  path: "/",
  type: "website",
});

export default function Home() {
  const profile = getProfile();
  const featuredProjects = getFeaturedProjects();

  return (
    <>
      <HeroSection profile={profile} />
      <PathSection />
      <ProofStrip />
      <ProjectsSection projects={featuredProjects} eyebrowIndex="04" />
      <ApproachSection />
      <ContactCTA profile={profile} />
    </>
  );
}
