import type { Metadata } from "next";
import { ApproachSection } from "@/app/_components/portfolio/approach/approach-section";
import { ContactCTA } from "@/app/_components/portfolio/contact/contact-cta";
import { ExperienceSection } from "@/app/_components/portfolio/experience/experience-section";
import { HeroSection } from "@/app/_components/portfolio/hero/hero-section";
import { ProjectsSection } from "@/app/_components/portfolio/projects/projects-section";
import { ProofStrip } from "@/app/_components/portfolio/proof/proof-strip";
import { SkillsSection } from "@/app/_components/portfolio/skills/skills-section";
import {
  getExperience,
  getFeaturedProjects,
  getProfile,
  getSkills,
} from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title:
    "Hector Gonzalez | Full-Stack Engineer, Co-Founder, Applied AI Builder",
  description:
    "Product-minded full-stack engineer building learning systems, internal tools, and applied AI. Co-founder & CTO at Stiegler EdTech.",
  keywords: [
    "Hector Gonzalez",
    "Full-Stack Engineer",
    "Technical Product",
    "Applied AI",
    "AI Engineer",
    "CTO",
    "Co-Founder",
    "Next.js",
    "TypeScript",
    "EdTech",
    "Learning Systems",
  ],
  type: "website",
});

export default function Home() {
  const profile = getProfile();
  const skills = getSkills();
  const featuredProjects = getFeaturedProjects();
  const allExperience = getExperience();

  // Show only the 2 most recent experiences on home page
  const recentExperience = {
    experience: allExperience.experience.slice(0, 2),
  };

  return (
    <>
      <HeroSection profile={profile} />
      <ProofStrip />
      <SkillsSection skills={skills} eyebrowIndex="03" />
      <ProjectsSection projects={featuredProjects} eyebrowIndex="04" />
      <ExperienceSection
        experience={recentExperience}
        showCTA={true}
        eyebrowIndex="05"
        heading="Where I've built and shipped recently."
      />
      <ApproachSection />
      <ContactCTA profile={profile} />
    </>
  );
}
