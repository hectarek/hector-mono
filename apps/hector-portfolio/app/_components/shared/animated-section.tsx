"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeInUp } from "@/src/lib/animations";
import { useScrollReveal } from "@/src/lib/use-scroll-reveal";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
}

/**
 * Animated section wrapper component
 * Wraps sections with fade-in-up animation
 */
export function AnimatedSection({
  children,
  className,
  variants = fadeInUp,
  delay = 0,
}: AnimatedSectionProps) {
  const scrollReveal = useScrollReveal();

  return (
    <motion.section
      className={className}
      {...scrollReveal}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.section>
  );
}
