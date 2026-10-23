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
      className="relative px-4 py-20 sm:py-24"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={heroVariants}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-t mb-10" />

        <SectionEyebrow index="06" label="Get in touch" />

        <m.h2
          className="font-mono mt-5 max-w-3xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl"
          variants={heroItem}
        >
          Got work that should be easier?
        </m.h2>

        <m.p
          className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={heroItem}
        >
          I&apos;m in Charlotte. Email is the fastest way to reach me.
        </m.p>

        <m.div className="mt-8 flex flex-wrap gap-3" variants={heroItem}>
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
