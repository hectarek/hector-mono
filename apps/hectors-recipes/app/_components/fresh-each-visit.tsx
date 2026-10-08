"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

// Next.js keeps a page you left alive (React's Activity, under Cache Components). Coming
// back with Back or Forward should find it as you left it; arriving by a link or a redirect
// should start it over, so a recipe you saved or threw away isn't still in the form
// (docs/ux-plan.md D88). `bfcacheId` changes on exactly those fresh arrivals.
export function FreshEachVisit({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
