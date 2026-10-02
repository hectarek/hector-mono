"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { TechnologyBadge } from "@/app/_components/portfolio/shared/technology-badge";
import type { Experience } from "@/src/types/portfolio";

interface ExperienceCardProps {
  experience: Experience;
}

const INITIAL_TECH_COUNT = 8;

function deriveBullets(description: string): string[] {
  return description
    .split(/(?<=\.)\s+(?=[A-Z])|(?<=—)\s+/)
    .map((point) => point.trim())
    .filter((point) => point.length > 0);
}

export function ExperienceCard({ experience }: ExperienceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMoreTech = experience.technologies.length > INITIAL_TECH_COUNT;
  const visibleTech = isExpanded
    ? experience.technologies
    : experience.technologies.slice(0, INITIAL_TECH_COUNT);

  const bullets =
    experience.bullets && experience.bullets.length > 0
      ? experience.bullets
      : deriveBullets(experience.description);

  return (
    <div className="relative border-l border-border pl-6 pb-10 last:pb-0">
      <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-foreground/25 bg-background" />

      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {experience.role}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {experience.period}
        </span>
      </div>
      <p className="text-base font-medium text-muted-foreground">
        {experience.company}
        {experience.location && (
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            · {experience.location}
          </span>
        )}
      </p>

      {experience.metrics && experience.metrics.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-2">
          {experience.metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-baseline gap-2 rounded-md border border-border bg-background px-3 py-1.5"
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="font-mono text-sm font-semibold text-accent">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <ul className="mt-5 space-y-2.5 text-base leading-relaxed text-muted-foreground">
        {bullets.map((point) => (
          <li
            key={`${experience.company}-${experience.role}-${point.slice(0, 24)}`}
            className="flex gap-3"
          >
            <span
              className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70"
              aria-hidden
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {visibleTech.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {visibleTech.map((tech) => (
            <TechnologyBadge
              key={tech}
              technology={tech}
              variant="outline"
              size="sm"
            />
          ))}
        </div>
      )}

      {hasMoreTech && (
        <Button
          size="label"
          variant="quiet"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 -ml-5"
        >
          {isExpanded ? (
            <>
              See less
              <ChevronDown className="ml-1 h-3 w-3 rotate-180" />
            </>
          ) : (
            <>
              + {experience.technologies.length - INITIAL_TECH_COUNT} more
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
