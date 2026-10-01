import { Button } from "@repo/ui/components/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SectionEyebrow } from "@/app/_components/portfolio/shared/section-eyebrow";
import { StatusChip } from "@/app/_components/portfolio/shared/status-chip";
import { GitHubIcon } from "@/app/_components/shared/brand-icons";
import type { Project } from "@/src/types/portfolio";
import { ProjectBadges } from "./project-badges";

interface ProjectDetailProps {
  project: Project;
}

interface SectionBlockProps {
  index: string;
  label: string;
  heading: string;
  children: React.ReactNode;
}

function SectionBlock({ index, label, heading, children }: SectionBlockProps) {
  return (
    <section className="mt-12 first:mt-0">
      <SectionEyebrow index={index} label={label} />
      <h2 className="font-mono mt-4 text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const hasCaseStudy =
    project.problem || project.solution || project.impact || project.features;
  const hasExtraLinks = project.links && project.links.length > 0;

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <Link
        href="/projects"
        className="mb-12 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-accent"
        aria-label="Back to projects page"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to projects
      </Link>

      <header className="mb-12">
        {project.status && (
          <div className="mb-5">
            <StatusChip label={project.status} />
          </div>
        )}
        <h1 className="font-mono text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {project.title}
        </h1>
        {project.role && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {project.role}
          </p>
        )}
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {project.longDescription}
        </p>
      </header>

      {project.image && (
        <div className="relative mb-12 aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted">
          <Image
            src={project.image}
            alt={`${project.title} project image`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {project.metrics && project.metrics.length > 0 && (
        <dl className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {project.metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="flex flex-col gap-1 bg-background p-4"
            >
              <div className="flex items-center justify-between">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {metric.label}
                </dt>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <dd className="font-mono text-2xl font-medium tracking-tight text-accent">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mb-12 flex flex-wrap items-center gap-3">
        {project.url && (
          <Button
            size="label"
            nativeButton={false}
            render={
              <Link
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="default"
            aria-label={`View ${project.title} live site`}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            View live site
          </Button>
        )}
        {project.github && (
          <Button
            size="label"
            nativeButton={false}
            render={
              <Link
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            aria-label={`View ${project.title} source code`}
          >
            <GitHubIcon className="mr-2 h-3.5 w-3.5" />
            View code
          </Button>
        )}
        {hasExtraLinks &&
          project.links?.map((link) => (
            <Button
              size="label"
              key={link.url}
              nativeButton={false}
              render={
                <Link
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              {link.label}
            </Button>
          ))}
      </div>

      <SectionBlock index="01" label="Stack" heading="What it's built with">
        <ProjectBadges technologies={project.technologies} />
      </SectionBlock>

      {hasCaseStudy && (
        <>
          {project.problem && (
            <SectionBlock index="02" label="Context" heading="The problem">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {project.problem}
              </p>
            </SectionBlock>
          )}

          {project.solution && (
            <SectionBlock index="03" label="Approach" heading="What I built">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {project.solution}
              </p>
            </SectionBlock>
          )}

          {project.features && project.features.length > 0 && (
            <SectionBlock index="04" label="System" heading="What's inside">
              <ul className="grid gap-2 sm:grid-cols-2">
                {project.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground transition-colors hover:border-foreground/25"
                  >
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {project.impact && (
            <SectionBlock index="05" label="Outcome" heading="The impact">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {project.impact}
              </p>
            </SectionBlock>
          )}
        </>
      )}

      {project.highlights && project.highlights.length > 0 && (
        <SectionBlock index="06" label="Highlights" heading="What stood out">
          <ul className="space-y-3">
            {project.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex gap-3 text-base leading-relaxed text-muted-foreground"
              >
                <span
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      <div className="mt-20 border-t border-border pt-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to all projects
        </Link>
      </div>
    </article>
  );
}
