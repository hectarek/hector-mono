"use client";

import { m } from "framer-motion";
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
    title: "Start with the real problem",
    body: "Most requests come in vague. I talk to the people doing the work before I suggest building anything.",
  },
  {
    step: "02",
    title: "Build what a small team can keep running",
    body: "I build the simplest thing that works, with tests and monitoring, so it keeps working after launch.",
  },
  {
    step: "03",
    title: "Use AI, and check its work",
    body: "I write a short spec before I prompt and read every change like a teammate's pull request. The decisions are mine.",
  },
];

export function ApproachSection() {
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

        <SectionEyebrow index="05" label="How I work" />

        <m.h2
          className="font-mono mt-5 max-w-2xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={fadeInUp}
        >
          What working with me looks like.
        </m.h2>

        <m.ol
          className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3"
          variants={staggerContainer}
        >
          {APPROACH_ITEMS.map((item) => (
            <m.li
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
            </m.li>
          ))}
        </m.ol>

        <m.p
          className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground"
          variants={fadeInUp}
        >
          What I use most: TypeScript, React, Next.js, Node, Postgres, the
          Vercel AI SDK and Claude.
        </m.p>
      </div>
    </m.section>
  );
}
