"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { staggerContainer, viewportOptions } from "@/src/lib/animations";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  staggerSpeed?: "fast" | "normal" | "slow";
}

/**
 * Animated container component for staggered animations
 * Use this to wrap lists/grids of items that should animate in sequence
 */
export function AnimatedContainer({
  children,
  className,
  variants,
  staggerSpeed = "normal",
}: AnimatedContainerProps) {
  const containerVariants =
    variants ||
    (staggerSpeed === "fast"
      ? require("@/src/lib/animations").staggerContainerFast
      : staggerSpeed === "slow"
        ? require("@/src/lib/animations").staggerContainerSlow
        : staggerContainer);

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
}
