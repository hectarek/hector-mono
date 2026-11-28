import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepView } from "@/app/_components/walkthrough/step-view";
import { STEPS } from "@/src/content/steps";
import { stepMetadata } from "../step-metadata";

type StepPageProps = { params: Promise<{ step: string }> };

// Every step is real HTML at its own link, so it reads before the page's code loads and on
// phones too old to run it (KTD11).
export function generateStaticParams() {
  return STEPS.map((step) => ({ step: step.slug }));
}

function indexOf(slug: string): number {
  return STEPS.findIndex((step) => step.slug === slug);
}

export async function generateMetadata({
  params,
}: StepPageProps): Promise<Metadata> {
  return stepMetadata(indexOf((await params).step));
}

export default async function StepPage({ params }: StepPageProps) {
  const index = indexOf((await params).step);
  if (index < 0) notFound();
  return <StepView index={index} />;
}
