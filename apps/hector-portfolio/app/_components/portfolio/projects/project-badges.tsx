import { TechnologyBadge } from "@/app/_components/portfolio/shared/technology-badge";

interface ProjectBadgesProps {
  technologies: string[];
}

export function ProjectBadges({ technologies }: ProjectBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {technologies.map((tech) => (
        <TechnologyBadge
          key={tech}
          technology={tech}
          variant="outline"
          size="sm"
        />
      ))}
    </div>
  );
}
