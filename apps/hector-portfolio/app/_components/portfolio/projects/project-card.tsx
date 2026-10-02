"use client";

import { Button } from "@repo/ui/components/button";
import { m } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GitHubIcon } from "@/app/_components/shared/brand-icons";
import type { Project } from "@/src/types/portfolio";
import { StatusChip } from "../shared/status-chip";
import { ProjectBadges } from "./project-badges";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const keyMetric = project.metrics?.[0];

  return (
    <m.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      initial={{ opacity: 1 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-accent/60"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-muted">
        {project.image ? (
          <Image
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            data-texture="dot-grid"
            className="flex h-full w-full items-end justify-between p-5"
          >
            <span className="font-mono text-2xl font-medium leading-none text-muted-foreground">
              {project.title.split(" ").slice(0, 2).join(" ")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              /{project.slug}
            </span>
          </div>
        )}
        {project.status && (
          <div className="absolute left-3 top-3">
            <StatusChip label={project.status} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            {project.title}
          </h3>
          {keyMetric && (
            <div className="text-right">
              <p className="font-mono text-base font-medium text-accent">
                {keyMetric.value}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {keyMetric.label}
              </p>
            </div>
          )}
        </div>

        {project.role && (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {project.role}
          </p>
        )}

        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-auto pt-2">
          <ProjectBadges technologies={project.technologies.slice(0, 5)} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project.url && (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
              size="sm"
              className="h-8 border-border px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-accent hover:text-accent"
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Live
            </Button>
          )}
          {project.github && (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
              size="sm"
              className="h-8 border-border px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-accent hover:text-accent"
            >
              <GitHubIcon className="mr-1.5 h-3 w-3" />
              Code
            </Button>
          )}
          <Button
            nativeButton={false}
            render={<Link href={`/projects/${project.slug}`} />}
            variant="default"
            size="sm"
            className="ml-auto h-8 bg-foreground px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-background hover:bg-foreground/90"
          >
            Case study
            <span className="sr-only">: {project.title}</span>
            <ArrowUpRight className="ml-1.5 h-3 w-3" />
          </Button>
        </div>
      </div>
    </m.article>
  );
}
