"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { staggerItem } from "@/src/lib/animations";

interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}

/**
 * Animated item component for staggered lists
 * Use this as a child of AnimatedContainer to create staggered animations
 */
export function AnimatedItem({
  children,
  className,
  variants = staggerItem,
}: AnimatedItemProps) {
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
