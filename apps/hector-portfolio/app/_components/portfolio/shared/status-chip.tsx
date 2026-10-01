import { cn } from "@repo/ui/lib/utils";

interface StatusChipProps {
  label: string;
  tone?: "live" | "applied" | "public" | "archive" | "neutral";
  className?: string;
}

const TONE_DOT: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  live: "bg-accent",
  applied: "bg-accent/80",
  public: "bg-accent/60",
  archive: "bg-muted-foreground/70",
  neutral: "bg-muted-foreground",
};

function deriveTone(label: string): NonNullable<StatusChipProps["tone"]> {
  const lower = label.toLowerCase();
  if (lower.includes("production") || lower.includes("live")) return "live";
  if (lower.includes("applied") || lower.includes("ai")) return "applied";
  if (lower.includes("public") || lower.includes("game")) return "public";
  if (lower.includes("archive") || lower.includes("legacy")) return "archive";
  return "neutral";
}

export function StatusChip({ label, tone, className }: StatusChipProps) {
  const resolvedTone = tone ?? deriveTone(label);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          TONE_DOT[resolvedTone],
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
