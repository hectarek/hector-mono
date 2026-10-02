import type { Metadata } from "next";
import { AboutContent } from "@/app/_components/portfolio/about/about-content";
import { getExperience, getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "About | Hector Gonzalez",
  description:
    "Full-stack engineer, strongest on the front end, who ships AI features. Banking → software → edtech CTO: the long version of how I work and what I build.",
  keywords: [
    "Hector Gonzalez",
    "Full-Stack Engineer",
    "Co-Founder",
    "CTO",
    "Applied AI",
    "Learning Systems",
    "EdTech",
    "Internal Tools",
  ],
  path: "/about",
  type: "profile",
});

export default function AboutPage() {
  const profile = getProfile();
  const experience = getExperience();

  return <AboutContent profile={profile} experience={experience} />;
}
