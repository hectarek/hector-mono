import type { Metadata } from "next";
import { NowContent } from "@/app/_components/portfolio/now/now-content";
import { getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Now | Hector Gonzalez",
  description:
    "What I'm working on now: client work, a recipes app I build in public, and what I'm reading.",
  keywords: ["Now", "Hector Gonzalez", "Current focus", "Currently building"],
  path: "/now",
  type: "website",
});

export default function NowPage() {
  const profile = getProfile();

  return <NowContent profile={profile} />;
}
