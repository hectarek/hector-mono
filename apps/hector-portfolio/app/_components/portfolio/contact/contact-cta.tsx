"use client";

import { Button } from "@repo/ui/components/button";
import { m } from "framer-motion";
import { Mail } from "lucide-react";
import Link from "next/link";
import { heroItem, heroVariants, viewportOptions } from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";
import { SectionEyebrow } from "../shared/section-eyebrow";

interface ContactCTAProps {
  profile: Profile;
}

export function ContactCTA({ profile }: ContactCTAProps) {
  return (
    <m.section
      className="relative px-4 py-16 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={heroVariants}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index="06" label="Get in touch" />

        <m.h2
          className="font-mono mt-5 max-w-3xl text-3xl font-medium text-balance leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={heroItem}
        >
          Got a problem that needs figuring out?
        </m.h2>

        <m.p
          className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={heroItem}
        >
          I&apos;m in Charlotte. Email is the fastest way to reach me.
        </m.p>

        <m.div
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          variants={heroItem}
        >
          <Button
            size="label"
            nativeButton={false}
            render={<Link href={`mailto:${profile.email}`} />}
          >
            <Mail className="mr-2 h-3.5 w-3.5" />
            Email me
          </Button>
          <Button
            size="label"
            nativeButton={false}
            render={<Link href="/about" />}
            variant="outline"
          >
            Read the long version
          </Button>
        </m.div>
      </div>
    </m.section>
  );
}
