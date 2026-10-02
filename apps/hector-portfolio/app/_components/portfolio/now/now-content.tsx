"use client";

import { motion } from "framer-motion";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import {
  fadeInUp,
  heroItem,
  heroVariants,
  staggerContainer,
  staggerItem,
  viewportOptions,
} from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";

interface NowContentProps {
  profile: Profile;
}

interface FocusItem {
  area: string;
  body: string;
}

const LAST_UPDATED = { label: "Oct 2, 2026", iso: "2026-10-02" };

const FOCUS_ITEMS: FocusItem[] = [
  {
    area: "The Notwork",
    body: "Running the production platform on my own: features, fixes, and the AI tooling built into it.",
  },
  {
    area: "Building in public",
    body: "My monorepo, hector-mono, is now public: this site, a recipes app, and an AI tools catalog, with lint, typecheck, and tests on every pull request.",
  },
  {
    area: "AI curriculum pipeline",
    body: "Keeping the nine-step lesson pipeline in production and pushing more of our content through it.",
  },
  {
    area: "CS fundamentals",
    body: "Working back through data structures, algorithms, and system design: the computer science I skipped by learning on the job.",
  },
];

const READING: string[] = [
  "Patterns for shipping AI features that don't break in production.",
  "Evaluating AI output: how to test and measure what a model produces.",
  "Learning science: spaced retrieval and how people keep what they learn.",
];

const TINKERING: string[] = [
  "3D printing and small home projects.",
  "Cooking most nights, and working out.",
  "Travel and short trips when I can fit them in.",
];

export function NowContent({ profile }: NowContentProps) {
  return (
    <>
      <motion.section
        className="relative px-4 pb-10 pt-12 sm:pt-20"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="relative mx-auto max-w-6xl">
          <motion.div variants={heroItem}>
            <SectionEyebrow index="N" label="Now" />
          </motion.div>
          <motion.h1
            className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            variants={heroItem}
          >
            What I&apos;m working on, right now
            <span className="text-accent">.</span>
          </motion.h1>
          <motion.p
            className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-muted-foreground sm:text-3xl"
            variants={heroItem}
          >
            Inspired by{" "}
            <a
              href="https://nownownow.com/about"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
            >
              Derek Sivers&apos; /now page
            </a>{" "}
            idea.
          </motion.p>
          <motion.p
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            Below is what currently has my attention &mdash; current focus,
            things I&apos;m reading, and what I&apos;m tinkering with outside of
            work. I update this when it changes meaningfully, not on a schedule.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70"
            variants={heroItem}
          >
            <span>
              Where:{" "}
              <span className="text-muted-foreground">
                {profile.location ?? "—"}
              </span>
            </span>
            <span>
              Last updated:{" "}
              <time
                dateTime={LAST_UPDATED.iso}
                className="text-muted-foreground"
              >
                {LAST_UPDATED.label}
              </time>
            </span>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N1" label="Current focus" />
          <motion.div
            className="mt-8 grid max-w-5xl gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
            variants={staggerContainer}
          >
            {FOCUS_ITEMS.map((item, index) => (
              <motion.div
                key={item.area}
                className="flex flex-col gap-2 bg-background p-6 transition-colors hover:bg-muted"
                variants={staggerItem}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.area}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N2" label="Reading & thinking about" />
          <motion.ul
            className="mt-8 max-w-3xl space-y-3"
            variants={staggerContainer}
          >
            {READING.map((item) => (
              <motion.li
                key={item}
                className="flex gap-3 text-base leading-relaxed text-muted-foreground"
                variants={staggerItem}
              >
                <span
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden
                />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N3" label="Outside of code" />
          <motion.ul
            className="mt-8 max-w-3xl space-y-3"
            variants={staggerContainer}
          >
            {TINKERING.map((item) => (
              <motion.li
                key={item}
                className="flex gap-3 text-base leading-relaxed text-muted-foreground"
                variants={staggerItem}
              >
                <span
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/70"
                  aria-hidden
                />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.section>
    </>
  );
}
