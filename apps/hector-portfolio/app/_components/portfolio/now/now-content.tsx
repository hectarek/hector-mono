"use client";

import { m } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
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
  body: ReactNode;
}

interface ReadingItem {
  title: string;
  source: string;
  href: string;
  note: string;
}

const LINK_CLASS =
  "underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

const LAST_UPDATED = { label: "Oct 23, 2026", iso: "2026-10-23" };

const FOCUS_ITEMS: FocusItem[] = [
  {
    area: "Client work",
    body: (
      <>
        Contract work for small clients: HubSpot automation and integrations for
        an online school, and{" "}
        <Link href="/projects/safe-bet" className={LINK_CLASS}>
          Safe Bet
        </Link>
        , a sports-betting compliance prototype for a startup.
      </>
    ),
  },
  {
    area: "A recipes app",
    body: "I build it in public, and a few people test it. It reads a recipe from a link or a photo, and cook mode walks you through one step at a time.",
  },
  {
    area: "Measuring its AI",
    body: "Next up: measuring how often the app reads a recipe right, so a prompt change can't quietly make it worse.",
  },
  {
    area: "hector-mono",
    body: "My public monorepo: this site, the recipes app and an AI tools catalog. Every pull request runs lint, typecheck and tests.",
  },
];

const READING: ReadingItem[] = [
  {
    title: "After Automation",
    source: "Dan Shipper, Every",
    href: "https://every.to/p/after-automation",
    note: "Why AI makes more work for people, not less.",
  },
  {
    title: "Pi Durable",
    source: "Earendil",
    href: "https://earendil.com/posts/pi-durable/",
    note: "Agents that save each step, so a run that crashes picks up where it left off.",
  },
  {
    title: "Getting the most out of Opus 5.5 in Claude and Claude Code",
    source: "Addy Osmani, claude.dev",
    href: "https://claude.dev/blog/getting-the-most-out-of-opus-5-5/#1-how-to-ask",
    note: "Give the model the whole task and say what done looks like, then let it run.",
  },
  {
    title: "AI Style Guides: How to Help AI Write Like You",
    source: "Katie Parrott, Every",
    href: "https://every.to/guides/ai-style-guide",
    note: "How to put your voice in writing so a model can match it.",
  },
];

const TINKERING: string[] = [
  "Learning to read and write Polish. I grew up speaking it.",
  "A modded Stardew Valley farm with friends.",
  "Three 3D printers, in an enclosure I built from wood and acrylic.",
];

export function NowContent({ profile }: NowContentProps) {
  return (
    <>
      <m.section
        className="relative px-4 pb-10 pt-12 sm:pt-20"
        // Visible from the first paint, as the home hero is: fading the header in
        // from opacity 0 left it blank until hydration.
        initial={false}
        animate="visible"
        variants={heroVariants}
      >
        <div className="relative mx-auto max-w-6xl">
          <m.div variants={heroItem}>
            <SectionEyebrow index="N" label="Now" />
          </m.div>
          <m.h1
            className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            variants={heroItem}
          >
            What I&apos;m working on now
            <span className="text-accent">.</span>
          </m.h1>
          <m.p
            className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-muted-foreground sm:text-3xl"
            variants={heroItem}
          >
            A /now page, an idea from{" "}
            <a
              href="https://nownownow.com/about"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              Derek Sivers
            </a>
            .
          </m.p>
          <m.p
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            What has my attention this month, at work and outside it. I update
            it when something changes.
          </m.p>
          <m.div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
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
          </m.div>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N1" label="Current focus" />
          <m.div
            className="mt-8 grid max-w-5xl gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
            variants={staggerContainer}
          >
            {FOCUS_ITEMS.map((item, index) => (
              <m.div
                key={item.area}
                className="flex flex-col gap-2 bg-background p-6 transition-colors hover:bg-muted"
                variants={staggerItem}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.area}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </m.div>
            ))}
          </m.div>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N2" label="Reading & thinking about" />
          <m.ul
            className="mt-8 max-w-3xl space-y-3"
            variants={staggerContainer}
          >
            {READING.map((item) => (
              <m.li
                key={item.href}
                className="flex gap-3 text-base leading-relaxed text-muted-foreground"
                variants={staggerItem}
              >
                <span
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden
                />
                <div>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-medium text-foreground ${LINK_CLASS}`}
                  >
                    {item.title}
                  </a>
                  <p className="mt-0.5 text-sm">
                    {item.source}. {item.note}
                  </p>
                </div>
              </m.li>
            ))}
          </m.ul>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <SectionEyebrow index="N3" label="Outside of code" />
          <m.ul
            className="mt-8 max-w-3xl space-y-3"
            variants={staggerContainer}
          >
            {TINKERING.map((item) => (
              <m.li
                key={item}
                className="flex gap-3 text-base leading-relaxed text-muted-foreground"
                variants={staggerItem}
              >
                <span
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/70"
                  aria-hidden
                />
                {item}
              </m.li>
            ))}
          </m.ul>
        </div>
      </m.section>
    </>
  );
}
