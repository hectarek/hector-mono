import type { Metadata } from "next";
import { stepPath } from "@/app/_components/walkthrough/step-view";
import { PAGES } from "@/src/content/pages";
import { STEPS } from "@/src/content/steps";
import { pageMetadata } from "@/src/seo";

const WALKTHROUGH = PAGES.find((p) => p.slug === "start");

// A step's metadata: its own title and link, the walkthrough's summary, and the walkthrough's
// preview, which every step shares for now. The first step's link is /start, at either address.
export function stepMetadata(index: number): Metadata {
  const step = STEPS[index];
  if (!step || !WALKTHROUGH) return {};
  return pageMetadata({
    title: step.title,
    description: WALKTHROUGH.summary,
    path: stepPath(index) as `/${string}`,
    preview: "start",
  });
}
