"use client";

import { cn } from "@repo/ui/lib/utils";
import { m } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navbarVariants,
  staggerContainerFast,
  staggerItem,
} from "@/src/lib/animations";

const navItems = [
  { href: "/projects", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <m.nav
      className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md"
      initial="hidden"
      animate="visible"
      variants={navbarVariants}
      aria-label="Primary"
    >
      <div className="mx-auto max-w-6xl px-4">
        <m.div
          className="flex h-16 items-center justify-between gap-4"
          variants={staggerContainerFast}
        >
          <m.div variants={staggerItem}>
            <Link
              href="/"
              className="group flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-accent"
            >
              <span
                className="font-mono text-muted-foreground transition-colors group-hover:text-accent"
                aria-hidden
              >
                /
              </span>
              <span>Hector Gonzalez</span>
            </Link>
          </m.div>
          <m.div
            className="flex items-center gap-0.5 sm:gap-1"
            variants={staggerContainerFast}
          >
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <m.div key={item.href} variants={staggerItem}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors sm:px-3 sm:text-xs",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "text-accent"
                          : "text-transparent group-hover:text-accent",
                      )}
                      aria-hidden
                    >
                      &gt;
                    </span>
                    {item.label}
                  </Link>
                </m.div>
              );
            })}
          </m.div>
        </m.div>
      </div>
    </m.nav>
  );
}
