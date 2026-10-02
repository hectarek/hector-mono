"use client";

import { Button } from "@repo/ui/components/button";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "@/app/_components/portfolio/contact/social-links";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import { heroItem, heroVariants, viewportOptions } from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";

interface ContactPageContentProps {
  profile: Profile;
}

export function ContactPageContent({ profile }: ContactPageContentProps) {
  return (
    <motion.div
      className="relative px-4 py-14 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      variants={heroVariants}
    >
      <div className="relative mx-auto max-w-6xl">
        <motion.div variants={heroItem}>
          <SectionEyebrow index="C" label="Contact" />
        </motion.div>
        <motion.h1
          className="font-mono mt-6 max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl"
          variants={heroItem}
        >
          Let&apos;s talk about what you&apos;re building
          <span className="text-accent">.</span>
        </motion.h1>
        <motion.p
          className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={heroItem}
        >
          Roles, collaborations, or a quick technical question &mdash; email is
          the fastest way in.
        </motion.p>

        <motion.div className="mt-12 space-y-10" variants={heroVariants}>
          <motion.div variants={heroItem}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Email
            </p>
            <div className="mt-3">
              <Button
                size="label"
                nativeButton={false}
                render={<Link href={`mailto:${profile.email}`} />}
                aria-label={`Send email to ${profile.email}`}
              >
                <Mail className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                <span className="lowercase">{profile.email}</span>
              </Button>
            </div>
          </motion.div>

          <motion.div variants={heroItem}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Elsewhere
            </p>
            <div className="mt-3">
              <SocialLinks profile={profile} />
            </div>
          </motion.div>

          {profile.location && (
            <motion.div variants={heroItem}>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Based in
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                {profile.location}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
