import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import { getSkillIconUrl } from "@/src/lib/skill-icons";

interface TechnologyBadgeProps {
  technology: string;
  variant?: "default" | "secondary" | "outline";
  size?: "sm" | "md";
}

export function TechnologyBadge({
  technology,
  variant = "outline",
  size = "sm",
}: TechnologyBadgeProps) {
  const iconUrl = getSkillIconUrl(technology, "light");

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? 12 : 14;

  const variantClasses =
    variant === "default"
      ? "bg-foreground text-background border border-foreground"
      : variant === "secondary"
        ? "bg-muted text-muted-foreground border border-border"
        : "bg-transparent text-muted-foreground border border-border hover:border-foreground/25";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-mono uppercase tracking-[0.08em] transition-colors",
        sizeClasses,
        variantClasses,
      )}
    >
      {iconUrl && (
        <Image
          src={iconUrl}
          alt=""
          aria-hidden
          width={iconSize}
          height={iconSize}
          className="shrink-0"
          unoptimized
        />
      )}
      <span className="lowercase">{technology}</span>
    </span>
  );
}
