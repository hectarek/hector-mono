"use client";

import { m } from "framer-motion";
import Link from "next/link";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  viewportOptions,
} from "@/src/lib/animations";
import { SectionEyebrow } from "../shared/section-eyebrow";

interface PathStep {
  year: string;
  text: string;
}

const PATH_STEPS: PathStep[] = [
  {
    year: "2018",
    text: "Risk and analytics at Wells Fargo, where I learned how a big company runs.",
  },
  {
    year: "2020",
    text: "Took a pay cut at the start of COVID to learn to code, then joined Ally's web team.",
  },
  {
    year: "2022",
    text: "My old program director asked me to write the next cohort's curriculum. That turned into co-founding Stiegler EdTech and teaching the program.",
  },
  {
    year: "2023 to now",
    text: "As CTO, I co-architected The Notwork, led the team that built it, and have run it on my own since 2025.",
  },
];

export function PathSection() {
  return (
    <m.section
      className="relative px-4 py-12 sm:py-16"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={fadeInUp}
    >
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow index="02" label="The path" />

        <m.ol className="mt-6 max-w-3xl" variants={staggerContainer}>
          {PATH_STEPS.map((step) => (
            <m.li
              key={step.year}
              className="grid gap-1 border-t border-border py-4 sm:grid-cols-[8rem_1fr] sm:gap-6"
              variants={staggerItem}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:pt-1">
                {step.year}
              </span>
              <p className="text-base leading-relaxed text-foreground">
                {step.text}
              </p>
            </m.li>
          ))}
        </m.ol>

        <m.div
          className="grid max-w-3xl gap-1 border-t border-border py-4 sm:grid-cols-[8rem_1fr] sm:gap-6"
          variants={fadeInUp}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:pt-1">
            Off the clock
          </span>
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              3D printing and home projects. I also have a music degree.
            </p>
            <Link
              href="/about"
              className="group mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-accent"
            >
              The long version
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </div>
        </m.div>
      </div>
    </m.section>
  );
}
