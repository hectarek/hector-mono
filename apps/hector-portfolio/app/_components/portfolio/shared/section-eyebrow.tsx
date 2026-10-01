import { cn } from "@repo/ui/lib/utils";

interface SectionEyebrowProps {
  index?: string;
  label: string;
  className?: string;
}

export function SectionEyebrow({
  index,
  label,
  className,
}: SectionEyebrowProps) {
  return (
    <div className={cn("flex items-center gap-4 sm:gap-5", className)}>
      {index && (
        <span
          className="font-mono text-3xl leading-none text-muted-foreground/30 sm:text-4xl"
          aria-hidden
        >
          {index}
        </span>
      )}
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-px w-6 bg-foreground/25" aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  );
}
