import { cn } from "@repo/ui/lib/utils";
import { Mail } from "lucide-react";
import Link from "next/link";
import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/app/_components/shared/brand-icons";
import type { Profile } from "@/src/types/portfolio";

interface SocialLinksProps {
  profile: Profile;
  variant?: "default" | "footer";
}

export function SocialLinks({
  profile,
  variant = "default",
}: SocialLinksProps) {
  const iconSize = variant === "footer" ? 16 : 18;
  const linkClass = cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-foreground/25 hover:text-accent",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {profile.social.github && (
        <Link
          href={profile.social.github}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="GitHub"
        >
          <GitHubIcon size={iconSize} />
        </Link>
      )}
      {profile.social.linkedin && (
        <Link
          href={profile.social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="LinkedIn"
        >
          <LinkedInIcon size={iconSize} />
        </Link>
      )}
      {profile.social.twitter && (
        <Link
          href={profile.social.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="X"
        >
          <XIcon size={iconSize} />
        </Link>
      )}
      {profile.email && (
        <Link
          href={`mailto:${profile.email}`}
          className={linkClass}
          aria-label="Email"
        >
          <Mail size={iconSize} />
        </Link>
      )}
    </div>
  );
}
