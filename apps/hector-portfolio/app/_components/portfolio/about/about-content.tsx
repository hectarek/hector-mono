"use client";

import { m } from "framer-motion";
import { ExperienceSection } from "@/app/_components/portfolio/experience/experience-section";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import { heroItem, heroVariants, viewportOptions } from "@/src/lib/animations";
import type { ExperienceData, Profile } from "@/src/types/portfolio";

interface AboutContentProps {
  profile: Profile;
  experience: ExperienceData;
}

interface BuildArea {
  title: string;
  body: string;
}

const BUILD_AREAS: BuildArea[] = [
  {
    title: "Production web platforms",
    body: "Full-stack Next.js products, front end first: interfaces people use every day, backed by the data, auth, integrations, and monitoring a real product needs.",
  },
  {
    title: "Applied AI features",
    body: "Multi-step AI pipelines with a person reviewing each step, AI grading, MCP integrations, and team-level AI enablement that changes how work gets done.",
  },
  {
    title: "Learning systems",
    body: "Game-based learning, mastery pathways, micro-credentials, and the tooling around teachers, programs, and competitions.",
  },
  {
    title: "Internal tools",
    body: "Admin systems, reporting, and messaging tools that pull a small team out of spreadsheets.",
  },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "Pragmatism over cleverness",
    body: "I optimize for the smallest useful system a small team can keep alive, not the most impressive one.",
  },
  {
    title: "Whole-product thinking",
    body: "I care about how the product runs, not just how the code reads. That includes operations, support, content, and the people using it.",
  },
  {
    title: "Honesty about depth",
    body: "My depth is front-end product engineering and applied AI, and I know the rest of the stack well enough to own a product on my own. I'll tell you when something is outside that instead of pretending it isn't.",
  },
];

export function AboutContent({ profile, experience }: AboutContentProps) {
  return (
    <>
      <m.section
        className="relative px-4 pb-10 pt-12 sm:pt-20"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="relative mx-auto max-w-6xl">
          <m.div variants={heroItem}>
            <SectionEyebrow index="A1" label="About" />
          </m.div>
          <m.h1
            className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            variants={heroItem}
          >
            I build practical software
            <br className="hidden sm:block" />
            around real problems<span className="text-accent">.</span>
          </m.h1>
          {profile.tagline && (
            <m.p
              className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-muted-foreground sm:text-3xl"
              variants={heroItem}
            >
              {profile.tagline}
            </m.p>
          )}
          <m.p
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            {profile.bio}
          </m.p>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A2" label="The path" />
          </m.div>
          <m.h2
            className="font-mono mt-6 max-w-3xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            Banking → software → edtech CTO.
          </m.h2>
          <m.div
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            <p>
              I started in banking through an early-talent rotational program at
              Wells Fargo. It gave me a real view of how a large business
              operates &mdash; risk, controls, analytics, stakeholders &mdash;
              but I wanted to be closer to where things were actually being
              built.
            </p>
            <p>
              I left the banking track for a six-month coding program through
              the Carolina Fintech Hub, took a serious pay cut, and pushed
              through it during the start of COVID. It worked: I landed a
              frontend role at Ally and learned what production engineering
              looks like inside a large corporate org.
            </p>
            <p>
              From there, my old program director asked me to help write
              curriculum for a new tech cohort. That contract turned into
              co-founding Stiegler EdTech, where I ran the CTAC program as
              Director of Curriculum and Programming &mdash; writing the
              curriculum and teaching it daily. More than 100 graduates of my
              first two cohorts were placed in full-time roles at Charlotte
              employers like Bank of America, Wells Fargo, Lowe&apos;s, and
              Truist.
            </p>
            <p>
              As the company grew, I moved into the CTO role. I co-architected
              The Notwork, our youth STEM and skilled-trades platform, led the
              team that built it and its 2025 rebuild, and have run it on my own
              since October 2025, along with the applied-AI work on top of it: a
              nine-step curriculum pipeline, AI grading, and the company&apos;s
              AI tooling.
            </p>
          </m.div>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A3" label="What I build" />
          </m.div>
          <m.h2
            className="font-mono mt-6 max-w-2xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            Software that runs in production for real people.
          </m.h2>
          <m.div
            className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
            variants={heroVariants}
          >
            {BUILD_AREAS.map((area, index) => (
              <m.div
                key={area.title}
                className="group flex flex-col gap-2 bg-background p-6 transition-colors hover:bg-muted"
                variants={heroItem}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {area.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {area.body}
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
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A4" label="How I work" />
          </m.div>
          <m.h2
            className="font-mono mt-6 max-w-3xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            A few principles I keep coming back to.
          </m.h2>
          <m.ol className="mt-10 max-w-3xl space-y-7" variants={heroVariants}>
            {PRINCIPLES.map((principle, index) => (
              <m.li
                key={principle.title}
                className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-6"
                variants={heroItem}
              >
                <span
                  aria-hidden
                  className="font-mono text-xl font-medium text-accent sm:w-12"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {principle.title}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {principle.body}
                  </p>
                </div>
              </m.li>
            ))}
          </m.ol>
        </div>
      </m.section>

      <m.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A5" label="Outside of work" />
          </m.div>
          <m.p
            className="font-serif mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground sm:text-2xl"
            variants={heroItem}
          >
            Outside of code, I cook, work out, 3D print, and travel when I can.
            I have a music degree, and I&apos;m happiest building something with
            my hands &mdash; home projects and a workshop full of tools waiting
            on the next idea.
          </m.p>
        </div>
      </m.section>

      <ExperienceSection
        experience={experience}
        eyebrowIndex="A6"
        heading="Full background."
        intro="Roles, programs, and stops along the way."
      />
    </>
  );
}
