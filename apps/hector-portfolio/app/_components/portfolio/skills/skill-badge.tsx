import { TechnologyBadge } from "@/app/_components/portfolio/shared/technology-badge";

interface SkillBadgeProps {
  skill: string;
}

export function SkillBadge({ skill }: SkillBadgeProps) {
  return <TechnologyBadge technology={skill} variant="outline" size="sm" />;
}
