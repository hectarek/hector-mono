import type { Metadata } from "next";
import { ReadingContent } from "@/app/_components/portfolio/reading/reading-content";
import { getReadingList } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Reading list | Hector Gonzalez",
  description:
    "Newsletters, blogs, podcasts, and feeds I use to stay current on engineering and the industry.",
  path: "/reading",
  noIndex: true,
});

export default function ReadingPage() {
  const readingList = getReadingList();

  return <ReadingContent readingList={readingList} />;
}
