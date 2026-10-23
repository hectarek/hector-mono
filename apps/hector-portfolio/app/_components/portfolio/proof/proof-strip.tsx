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
    label: "Platform users",
    hint: "Students and teachers on a platform I co-architected and keep running.",
  },
  {
    value: "95%+",
    label: "Time saved with AI",
    hint: "A week of lesson writing now takes half an hour or less, with a pipeline I built.",
  },
  {
    value: "10+",
    label: "Browser games",
    hint: "2D and 3D games I designed and built in Pixi.js and Three.js.",
  },
  {
    value: "100+",
    label: "Students hired",
    hint: "Of about 130 adults I taught to code, hired at places like Bank of America and Lowe's.",
  },
];

export function ProofStrip() {
  return (
    <m.section
      className="relative px-4 py-16 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index="03" label="Proof" />

        <h2 className="font-mono mt-5 text-3xl font-medium text-balance leading-tight tracking-tight text-foreground sm:text-4xl">
          What it&apos;s added up to so far.
        </h2>

        <m.dl
          className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
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
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {item.hint}
              </dd>
            </m.div>
          ))}
        </m.dl>
      </div>
    </m.section>
  );
}
