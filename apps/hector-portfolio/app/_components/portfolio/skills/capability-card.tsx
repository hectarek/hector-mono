"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SkillCategory } from "@/src/types/portfolio";
import { SkillBadge } from "./skill-badge";

interface CapabilityCardProps {
  category: SkillCategory;
  index: number;
}

const INITIAL_SKILLS_COUNT = 6;

export function CapabilityCard({ category, index }: CapabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = category.skills.length > INITIAL_SKILLS_COUNT;
  const visibleSkills = isExpanded
    ? category.skills
    : category.skills.slice(0, INITIAL_SKILLS_COUNT);

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-background p-5 transition-colors hover:border-accent/60 sm:p-6">
      <span
        aria-hidden
        className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <h3 className="mt-7 text-lg font-semibold text-foreground">
        {category.name}
      </h3>

      {category.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {category.description}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {visibleSkills.map((skill) => (
          <SkillBadge key={skill} skill={skill} />
        ))}
      </div>

      {hasMore && (
        <Button
          size="label"
          variant="quiet"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 self-start -ml-5"
        >
          {isExpanded ? (
            <>
              See less
              <ChevronDown className="ml-1 h-3 w-3 rotate-180" />
            </>
          ) : (
            <>
              + {category.skills.length - INITIAL_SKILLS_COUNT} more
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      )}
    </article>
  );
}
