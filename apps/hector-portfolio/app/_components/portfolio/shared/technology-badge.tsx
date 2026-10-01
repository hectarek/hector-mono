"use client";

import { useTheme } from "@repo/ui/components/theme-provider";
import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
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
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const iconTheme = currentTheme === "dark" ? "dark" : "light";

  const iconUrl = getSkillIconUrl(technology, iconTheme);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted && iconUrl && (
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
