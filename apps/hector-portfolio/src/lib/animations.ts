/**
 * Centralized animation configuration for the portfolio
 *
 * This file contains all animation variants and configurations used throughout
 * the portfolio. Adjust values here to easily maintain and update animations.
 */

import type { Variants } from "framer-motion";

/**
 * Animation timing configuration
 * Adjust these values to control animation speed globally
 */
const animationConfig = {
  // Base durations (in seconds)
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,

  // Easing functions for smooth motion
  easing: {
    smooth: [0.4, 0, 0.2, 1], // Custom cubic bezier
    spring: [0.68, -0.55, 0.265, 1.55], // Spring-like
    easeOut: [0.16, 1, 0.3, 1], // Ease out
  },

  // Stagger delays (in seconds)
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
} as const;

/**
 * Common animation variants
 * Reusable animation patterns for consistent motion throughout the portfolio
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.normal,
      ease: animationConfig.easing.smooth,
    },
  },
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.normal,
      ease: animationConfig.easing.smooth,
    },
  },
};

/**
 * Stagger container variants
 * Used for animating lists of items with staggered timing
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: animationConfig.stagger.normal,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: animationConfig.stagger.fast,
      delayChildren: 0.05,
    },
  },
};

/**
 * Stagger item variants
 * Used as children of stagger containers
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.normal,
      ease: animationConfig.easing.smooth,
    },
  },
};

export const staggerItemScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.normal,
      ease: animationConfig.easing.smooth,
    },
  },
};

/**
 * Section-specific animation variants
 * Custom animations for specific sections
 */
export const heroVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export const heroItem: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.slow,
      ease: animationConfig.easing.smooth,
    },
  },
};

export const navbarVariants: Variants = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: animationConfig.normal,
      ease: animationConfig.easing.easeOut,
    },
  },
};

/**
 * Viewport detection options
 * Controls when animations trigger based on scroll position
 */
export const viewportOptions = {
  once: true,
  // "some" avoids tall sections (e.g. reading / video) never reaching a % threshold on mobile
  amount: "some" as const,
} as const;
