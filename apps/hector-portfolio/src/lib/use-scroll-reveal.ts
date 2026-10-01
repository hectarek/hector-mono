"use client";

import { useReducedMotion } from "framer-motion";
import { viewportOptions } from "@/src/lib/animations";

export function useScrollReveal() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {
      initial: "visible" as const,
      animate: "visible" as const,
    };
  }

  return {
    initial: "hidden" as const,
    whileInView: "visible" as const,
    viewport: viewportOptions,
  };
}
