"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeInUp, viewportOptions } from "@/src/lib/animations";

interface AnimatedHeadingProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  variants?: Variants;
  delay?: number;
}

/**
 * Animated heading component
 * Wraps headings with fade-in-up animation
 */
export function AnimatedHeading({
  children,
  as: Component = "h2",
  className,
  variants = fadeInUp,
  delay = 0,
}: AnimatedHeadingProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={variants}
      transition={{ delay }}
    >
      <Component className={className}>{children}</Component>
    </motion.div>
  );
}
