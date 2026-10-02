"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeInUp } from "@/src/lib/animations";
import type { Profile } from "@/src/types/portfolio";
import { SocialLinks } from "./social-links";

interface FooterProps {
  profile: Profile;
}

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/projects", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/now", label: "Now" },
  { href: "/contact", label: "Contact" },
];

export function Footer({ profile }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      className="border-t border-border bg-muted px-4 py-12"
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          <motion.div className="space-y-2" variants={fadeInUp}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Hector Gonzalez
            </p>
            <p className="font-mono text-base font-medium text-foreground">
              Building, shipping, &amp; maintaining
              <span className="text-accent">.</span>
            </p>
            <p className="text-sm text-muted-foreground">
              © {currentYear}
              {profile.location ? ` · Built in ${profile.location}` : ""}
            </p>
          </motion.div>

          <motion.div className="space-y-3" variants={fadeInUp}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Site
            </p>
            <ul className="space-y-1.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div className="space-y-3 sm:text-right" variants={fadeInUp}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Elsewhere
            </p>
            <div className="sm:flex sm:justify-end">
              <SocialLinks profile={profile} variant="footer" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Built by hand · Next.js · Tailwind v4 ·{" "}
              <a
                href="https://github.com/hectarek/hector-mono/tree/main/apps/hector-portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 transition-colors hover:text-accent hover:underline"
              >
                Source
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
}
