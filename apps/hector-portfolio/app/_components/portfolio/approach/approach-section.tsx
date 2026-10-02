"use client";

import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  viewportOptions,
} from "@/src/lib/animations";
import { SectionEyebrow } from "../shared/section-eyebrow";

interface ApproachItem {
  step: string;
  title: string;
  body: string;
}

const APPROACH_ITEMS: ApproachItem[] = [
  {
    step: "01",
    title: "Scope the real problem",
    body: "Most asks come in vague. I sit with the actual problem, the constraints, and the people involved before suggesting a build.",
  },
  {
    step: "02",
    title: "Design the smallest useful system",
    body: "I prefer clean architecture, modern serverless tools, and a path that's maintainable by a small team — not the most clever option.",
  },
  {
    step: "03",
    title: "Ship it, then keep it alive",
    body: "I build to run in production: tests, error handling, logging, and monitoring, plus the AI workflows and internal tools that keep a product working after launch.",
  },
];

export function ApproachSection() {
  return (
    <motion.section
      className="relative px-4 py-16 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index="06" label="How I work" />

        <motion.h2
          className="font-mono mt-5 max-w-2xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={fadeInUp}
        >
          Ambiguity in. Useful systems out.
        </motion.h2>

        <motion.ol
          className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3"
          variants={staggerContainer}
        >
          {APPROACH_ITEMS.map((item) => (
            <motion.li
              key={item.step}
              className="group relative flex flex-col gap-3 bg-background p-6 transition-colors hover:bg-muted"
              variants={staggerItem}
            >
              <span className="font-mono text-2xl font-medium text-accent sm:text-3xl">
                {item.step}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </motion.section>
  );
}
