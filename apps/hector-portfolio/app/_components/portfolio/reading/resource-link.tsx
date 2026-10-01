import { ExternalLink } from "lucide-react";
import type { ReadingResource } from "@/src/types/portfolio";

interface ResourceLinkProps {
  resource: ReadingResource;
}

export function ResourceLink({ resource }: ResourceLinkProps) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-5 transition-colors hover:border-accent/60 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-accent sm:text-lg">
            {resource.name}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        </div>
        <ExternalLink
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-accent"
          aria-hidden
        />
      </div>
      {resource.cadence && (
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          {resource.cadence}
        </span>
      )}
    </a>
  );
}
