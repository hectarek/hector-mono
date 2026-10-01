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
    label: "Active users",
    hint: "On The Notwork production platform",
  },
  {
    value: "55+",
    label: "AI-generated lessons",
    hint: "From a 9-step curriculum pipeline",
  },
  {
    value: "11",
    label: "Skilled-trade games",
    hint: "Designed and shipped end to end",
  },
  {
    value: "~200",
    label: "Students supported",
    hint: "Through the CTAC tech cohort program",
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
              <div className="flex items-center justify-between">
                <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  {item.label}
                </dt>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <dd className="font-mono text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {item.value}
              </dd>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </p>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </motion.section>
  );
}
