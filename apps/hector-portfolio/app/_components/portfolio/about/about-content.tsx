"use client";

import { motion } from "framer-motion";
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
    title: "Learning systems",
    body: "Game-based learning, mastery pathways, micro-credentials, and the operational tooling around teachers, programs, and competitions.",
  },
  {
    title: "Applied AI workflows",
    body: "Multi-step AI pipelines, AI-assisted product development, MCP integrations, and team-level AI enablement that actually changes how work gets done.",
  },
  {
    title: "Internal tools & automation",
    body: "Admin systems, scripts, reporting, messaging, and the small but high-leverage tools that pull a small team out of spreadsheets.",
  },
  {
    title: "Production web platforms",
    body: "Full-stack Next.js products on serverless infrastructure: auth, data, integrations, content, communication, and the long tail of real product needs.",
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
    body: "I'm a strong generalist. I'll tell you when something is outside my depth instead of pretending it isn't.",
  },
];

export function AboutContent({ profile, experience }: AboutContentProps) {
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
            <SectionEyebrow index="A1" label="About" />
          </motion.div>
          <motion.h1
            className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            variants={heroItem}
          >
            I build practical software
            <br className="hidden sm:block" />
            around real problems<span className="text-accent">.</span>
          </motion.h1>
          {profile.tagline && (
            <motion.p
              className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-muted-foreground sm:text-3xl"
              variants={heroItem}
            >
              {profile.tagline}
            </motion.p>
          )}
          <motion.p
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            {profile.bio}
          </motion.p>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <motion.div variants={heroItem}>
            <SectionEyebrow index="A2" label="The path" />
          </motion.div>
          <motion.h2
            className="font-mono mt-6 max-w-3xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            Banking → software → edtech CTO.
          </motion.h2>
          <motion.div
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
              Director of Curriculum &mdash; teaching daily, designing the
              program, and helping roughly 200 students pursue software roles.
            </p>
            <p>
              As the company grew, I shifted into the CTO role to take more
              weight on technical product decisions. I co-architected and now
              solely maintain The Notwork &mdash; our youth STEM and
              skilled-trades platform &mdash; and lead our applied AI work,
              automation, and internal tooling.
            </p>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <motion.div variants={heroItem}>
            <SectionEyebrow index="A3" label="What I build" />
          </motion.div>
          <motion.h2
            className="font-mono mt-6 max-w-2xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            Software that runs in production for real people.
          </motion.h2>
          <motion.div
            className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
            variants={heroVariants}
          >
            {BUILD_AREAS.map((area, index) => (
              <motion.div
                key={area.title}
                className="group flex flex-col gap-2 bg-background p-6 transition-colors hover:bg-muted"
                variants={heroItem}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {area.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {area.body}
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
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <motion.div variants={heroItem}>
            <SectionEyebrow index="A4" label="How I work" />
          </motion.div>
          <motion.h2
            className="font-mono mt-6 max-w-3xl text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl"
            variants={heroItem}
          >
            A few principles I keep coming back to.
          </motion.h2>
          <motion.dl
            className="mt-10 max-w-3xl space-y-7"
            variants={heroVariants}
          >
            {PRINCIPLES.map((principle, index) => (
              <motion.div
                key={principle.title}
                className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-6"
                variants={heroItem}
              >
                <dt className="font-mono text-xl font-medium text-accent sm:w-12">
                  {String(index + 1).padStart(2, "0")}
                </dt>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {principle.title}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {principle.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </motion.section>

      <motion.section
        className="relative px-4 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <motion.div variants={heroItem}>
            <SectionEyebrow index="A5" label="Outside of work" />
          </motion.div>
          <motion.p
            className="font-serif mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground sm:text-2xl"
            variants={heroItem}
          >
            Outside of code, I&apos;m a tinkerer. I have a music degree and
            still play, I travel when I can, and I&apos;m happiest fixing or
            building something with my hands &mdash; 3D prints, home projects, a
            workshop full of tools waiting on the next idea.
          </motion.p>
        </div>
      </motion.section>

      {profile.consulting.available && (
        <motion.section
          className="relative px-4 py-12"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          variants={heroVariants}
        >
          <div className="mx-auto max-w-6xl">
            <motion.aside
              className="relative max-w-3xl rounded-lg border border-border bg-muted p-6 sm:p-7"
              variants={heroItem}
            >
              <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Consulting
              </p>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {profile.consulting.note} If your problem fits, the best way to
                start is a short note over email.
              </p>
            </motion.aside>
          </div>
        </motion.section>
      )}

      <ExperienceSection
        experience={experience}
        eyebrowIndex="A6"
        heading="Full background."
        intro="Roles, programs, and stops along the way."
      />
    </>
  );
}
