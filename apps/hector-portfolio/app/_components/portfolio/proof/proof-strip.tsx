"use client";

import { m } from "framer-motion";
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
    value: "10,000+",
    label: "Users",
    hint: "Students and teachers on The Notwork, which I co-architected and run",
  },
  {
    value: "95%+",
    label: "Less time per lesson",
    hint: "About a week down to half an hour, with an AI pipeline I built",
  },
  {
    value: "10+",
    label: "Browser games",
    hint: "Built on my own in Pixi.js and Three.js",
  },
  {
    value: "100+",
    label: "Graduates placed",
    hint: "Of about 130 adults I taught to code",
  },
];

export function ProofStrip() {
  return (
    <m.section
      className="relative px-4 py-12 sm:py-16"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow index="02" label="Proof" />

        <m.dl
          className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4"
          variants={staggerContainer}
        >
          {PROOF_ITEMS.map((item, index) => (
            <m.div
              key={item.label}
              className="@container relative flex flex-col gap-1.5 bg-background p-5 sm:p-6"
              variants={staggerItem}
            >
              <dt className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {item.label}
                <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
              </dt>
              {/* Sized to the cell, so the widest value, "10,000+", stays on one line on phones and tablets */}
              <dd className="font-mono text-[min(2.25rem,23cqi)] font-medium leading-[1.1] tracking-tight text-foreground">
                {item.value}
              </dd>
              <dd className="text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </dd>
            </m.div>
          ))}
        </m.dl>
      </div>
    </m.section>
  );
}
