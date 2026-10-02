"use client";

import { m } from "framer-motion";
import Link from "next/link";
import { ResourceLink } from "@/app/_components/portfolio/reading/resource-link";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import {
  fadeInUp,
  heroItem,
  heroVariants,
  staggerContainer,
  staggerItem,
} from "@/src/lib/animations";
import { useScrollReveal } from "@/src/lib/use-scroll-reveal";
import type { ReadingListData } from "@/src/types/portfolio";

interface ReadingContentProps {
  readingList: ReadingListData;
}

function formatLastUpdated(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReadingContent({ readingList }: ReadingContentProps) {
  const scrollReveal = useScrollReveal();

  return (
    <>
      <m.section
        className="relative px-4 pb-10 pt-12 sm:pt-20"
        {...scrollReveal}
        variants={heroVariants}
      >
        <div className="relative mx-auto max-w-6xl">
          <m.div variants={heroItem}>
            <SectionEyebrow index="R" label="Reading list" />
          </m.div>
          <m.h1
            className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            variants={heroItem}
          >
            What I read to stay current
            <span className="text-accent">.</span>
          </m.h1>
          <m.p
            className="font-serif mt-5 max-w-3xl text-2xl italic leading-snug text-muted-foreground sm:text-3xl"
            variants={heroItem}
          >
            Newsletters, blogs, podcasts, and feeds — the stuff I actually use.
          </m.p>
          <m.p
            className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            variants={heroItem}
          >
            {readingList.intro}
          </m.p>
          <m.div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
            variants={heroItem}
          >
            <span>
              Last curated:{" "}
              <span className="text-muted-foreground">
                {formatLastUpdated(readingList.lastUpdated)}
              </span>
            </span>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-accent"
            >
              Back to portfolio
            </Link>
          </m.div>
        </div>
      </m.section>

      {readingList.categories.map((category, categoryIndex) => (
        <m.section
          key={category.id}
          className="relative px-4 py-12 sm:py-16"
          {...scrollReveal}
          variants={fadeInUp}
        >
          <div className="mx-auto max-w-6xl">
            <div className="border-t mb-8" />
            <SectionEyebrow
              index={`R${categoryIndex + 1}`}
              label={category.name}
            />
            {category.description && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {category.description}
              </p>
            )}
            {category.resources.length === 0 ? (
              <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Nothing saved yet — I&apos;ll drop standouts here when I find
                something worth sharing.
              </p>
            ) : (
              <m.ul
                className={
                  category.id === "articles"
                    ? "mt-8 grid max-w-3xl gap-3"
                    : "mt-8 grid max-w-4xl gap-3 sm:grid-cols-2"
                }
                variants={staggerContainer}
              >
                {category.resources.map((resource) => (
                  <m.li key={resource.url} variants={staggerItem}>
                    <ResourceLink resource={resource} />
                  </m.li>
                ))}
              </m.ul>
            )}
          </div>
        </m.section>
      ))}

      <m.section
        className="relative px-4 pb-16 pt-4 sm:pb-24"
        {...scrollReveal}
        variants={fadeInUp}
      >
        <div className="mx-auto max-w-6xl">
          <div className="border-t mb-8" />
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Shared on request — if a link is dead or you want a rec in a
            category I missed, say hi via{" "}
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-accent"
            >
              contact
            </Link>
            .
          </p>
        </div>
      </m.section>
    </>
  );
}
