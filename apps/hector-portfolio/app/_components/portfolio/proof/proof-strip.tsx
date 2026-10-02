"use client";

import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  viewportOptions,
} from "@/src/lib/animations";
import { SectionEyebrow } from "../shared/section-eyebrow";

interface ProofItem {
  value: string;
  label: string;
  hint: string;
}

const PROOF_ITEMS: ProofItem[] = [
  {
    value: "~24K",
    label: "Users",
    hint: "On The Notwork, the platform I co-architected and run",
  },
  {
    value: "30 min",
    label: "Lesson build time",
    hint: "Down from about a week, with a nine-step AI pipeline",
  },
  {
    value: "10",
    label: "Playable games",
    hint: "Built solo in Pixi.js and Three.js",
  },
  {
    value: "100+",
    label: "Graduates placed",
    hint: "From the first two cohorts I taught",
  },
];

export function ProofStrip() {
  return (
    <motion.section
      className="relative px-4 py-12 sm:py-16"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow index="02" label="Proof" />

        <motion.dl
          className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4"
          variants={staggerContainer}
        >
          {PROOF_ITEMS.map((item, index) => (
            <motion.div
              key={item.label}
              className="relative flex flex-col gap-1.5 bg-background p-5 sm:p-6"
              variants={staggerItem}
            >
              <dt className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {item.label}
                <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
              </dt>
              <dd className="font-mono text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {item.value}
              </dd>
              <dd className="text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </motion.section>
  );
}
