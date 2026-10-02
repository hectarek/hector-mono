import type { Metadata } from "next";
import { NowContent } from "@/app/_components/portfolio/now/now-content";
import { getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Now | Hector Gonzalez",
  description:
    "What I'm working on right now: current focus, what I'm learning, and what I'm building outside of work.",
  keywords: ["Now", "Hector Gonzalez", "Current focus", "Currently building"],
  path: "/now",
  type: "website",
});

export default function NowPage() {
  const profile = getProfile();

  return <NowContent profile={profile} />;
}
