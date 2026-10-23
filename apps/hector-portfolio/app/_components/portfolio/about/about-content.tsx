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
    title: "Web platforms",
    body: "Full-stack Next.js products, front end first: the screens people see, plus the data, auth, integrations and monitoring behind them.",
  },
  {
    title: "Applied AI",
    body: "Multi-step pipelines with a person checking each step, AI-assisted grading, MCP integrations, and helping a whole team work with AI.",
  },
  {
    title: "Learning systems",
    body: "Game-based learning, mastery pathways, micro-credentials, and the tools teachers, programs and competitions run on.",
  },
  {
    title: "Internal tools",
    body: "Admin, reporting and messaging tools that get a small team out of spreadsheets.",
  },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "The whole product, not just the code",
    body: "I pay attention to how it runs after launch: support, content, operations and the people using it.",
  },
  {
    title: "Say what I don't know",
    body: "My depth is the front end and applied AI, and I know the rest of the stack well enough to own a product. When something's outside that, I say so.",
  },
  {
    title: "Teach as I go",
    body: "I've taught adults to code, reviewed my team's pull requests every week and trained a whole staff on AI tools. On a team, I explain my decisions and write things down.",
  },
];

// The sections after the intro share the home page's rhythm: padding, rule, eyebrow, heading
const SECTION = "relative px-4 py-16 sm:py-20";
const HEADING =
  "font-mono mt-5 max-w-4xl text-3xl font-medium leading-tight tracking-tight text-balance text-foreground sm:text-4xl";

export function AboutContent({ profile, experience }: AboutContentProps) {
  return (
    <>
      <m.section
        className="relative px-4 pb-16 pt-12 sm:pb-20 sm:pt-20"
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
            The long version<span className="text-accent">.</span>
          </m.h1>
          {profile.tagline && (
            <m.p
              className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-balance text-muted-foreground sm:text-3xl"
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
        className={SECTION}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-10" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A2" label="The path" />
          </m.div>
          <m.h2 className={HEADING} variants={heroItem}>
            How I got here.
          </m.h2>
          <m.div
            className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            <p>
              I started in banking, in an early-talent rotation at Wells Fargo.
              It showed me how a big company runs: risk, controls, analytics and
              the people who sign off on things. But I wanted to be closer to
              where things got built.
            </p>
            <p>
              So I left for a six-month coding program at the Carolina Fintech
              Hub. That meant a real pay cut, right at the start of COVID. It
              worked out: I joined Ally as a front-end developer and learned how
              production software gets built at a large company.
            </p>
            <p>
              Then my old program director asked me to help write the curriculum
              for a new cohort. That turned into co-founding Stiegler EdTech,
              where I ran the same program I&apos;d gone through, writing the
              curriculum and teaching it every day. Of the 130 or so career
              changers I taught, more than 100 were hired into full-time roles
              at Charlotte employers like Bank of America, Wells Fargo,
              Lowe&apos;s and Truist.
            </p>
            <p>
              As the company grew, I became CTO. I co-architected The Notwork,
              the platform behind North Carolina&apos;s first state-backed
              esports and STEM league, led the team that built it and its 2025
              rebuild, and have run it on my own since October 2025. I also
              built the AI on top of it, like the lesson pipeline and
              AI-assisted grading, and set up the company&apos;s AI tools and
              trained the staff on them.
            </p>
          </m.div>
        </div>
      </m.section>

      <m.section
        className={SECTION}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-10" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A3" label="What I build" />
          </m.div>
          <m.h2 className={HEADING} variants={heroItem}>
            Software that people use every day.
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
        className={SECTION}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-10" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A4" label="How I work" />
          </m.div>
          <m.h2 className={HEADING} variants={heroItem}>
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
        className={SECTION}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOptions}
        variants={heroVariants}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-10" />
          <m.div variants={heroItem}>
            <SectionEyebrow index="A5" label="Outside of work" />
          </m.div>
          <m.h2 className={HEADING} variants={heroItem}>
            I build things off the clock too.
          </m.h2>
          <m.p
            className="font-serif mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground sm:text-2xl"
            variants={heroItem}
          >
            I 3D print and do my own home projects, and someday I&apos;d like a
            real workshop. I also cook, work out and travel when I can, and I
            have a music degree.
          </m.p>
        </div>
      </m.section>

      <ExperienceSection
        experience={experience}
        eyebrowIndex="A6"
        heading="Full background."
        intro="Every role, newest first."
      />
    </>
  );
}
