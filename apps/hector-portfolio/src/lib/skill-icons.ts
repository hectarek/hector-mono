/**
 * Skill Icons Mapping
 *
 * Maps skill names to their skill-icons repository icon filenames.
 * Uses individual SVG files from the skill-icons GitHub repository.
 *
 * Repository: https://github.com/tandpfun/skill-icons
 * Browse icons: https://skillicons.dev/
 */

/**
 * Map of skill names to their skill-icons icon filenames
 * Format: IconName-Dark.svg or IconName.svg (for light theme)
 * Check available icons: https://github.com/tandpfun/skill-icons/tree/main/icons
 */
export const skillIconMap: Record<string, { light: string; dark: string }> = {
  // Frameworks & Libraries
  "Next.js": { light: "NextJS-Light.svg", dark: "NextJS-Dark.svg" },
  React: { light: "React-Dark.svg", dark: "React-Dark.svg" },
  TypeScript: { light: "TypeScript.svg", dark: "TypeScript.svg" },
  JavaScript: { light: "JavaScript.svg", dark: "JavaScript.svg" },
  "Node.js": { light: "NodeJS-Light.svg", dark: "NodeJS-Dark.svg" },
  Bun: { light: "Bun-Light.svg", dark: "Bun-Dark.svg" },
  "Tailwind CSS": {
    light: "TailwindCSS-Light.svg",
    dark: "TailwindCSS-Dark.svg",
  },
  HTML: { light: "HTML.svg", dark: "HTML.svg" },
  CSS: { light: "CSS.svg", dark: "CSS.svg" },
  Sass: { light: "Sass.svg", dark: "Sass.svg" },
  Jest: { light: "Jest.svg", dark: "Jest.svg" },
  "Three.js": { light: "ThreeJS-Light.svg", dark: "ThreeJS-Dark.svg" },

  // Databases & ORMs
  PostgreSQL: { light: "PostgreSQL-Light.svg", dark: "PostgreSQL-Dark.svg" },
  MySQL: { light: "MySQL-Light.svg", dark: "MySQL-Dark.svg" },
  SQL: { light: "PostgreSQL-Dark.svg", dark: "PostgreSQL-Dark.svg" },
  Redis: { light: "Redis-Light.svg", dark: "Redis-Dark.svg" },

  // Languages
  Python: { light: "Python-Light.svg", dark: "Python-Dark.svg" },
  Go: { light: "GoLang.svg", dark: "GoLang.svg" },
  Rust: { light: "Rust.svg", dark: "Rust.svg" },
  Java: { light: "Java-Light.svg", dark: "Java-Dark.svg" },
  "Spring Boot": { light: "Spring-Light.svg", dark: "Spring-Dark.svg" },

  // DevOps, Cloud & Infra
  Docker: { light: "Docker.svg", dark: "Docker.svg" },
  Kubernetes: { light: "Kubernetes.svg", dark: "Kubernetes.svg" },
  Vercel: { light: "Vercel-Light.svg", dark: "Vercel-Dark.svg" },
  Cloudflare: { light: "Cloudflare-Light.svg", dark: "Cloudflare-Dark.svg" },
  Sentry: { light: "Sentry.svg", dark: "Sentry.svg" },

  // Tools
  Git: { light: "Git.svg", dark: "Git.svg" },
  GitHub: { light: "Github-Light.svg", dark: "Github-Dark.svg" },
  "GitHub Actions": {
    light: "GithubActions-Light.svg",
    dark: "GithubActions-Dark.svg",
  },
  GitLab: { light: "GitLab-Light.svg", dark: "GitLab-Dark.svg" },
  Figma: { light: "Figma-Light.svg", dark: "Figma-Dark.svg" },
  Notion: { light: "Notion-Light.svg", dark: "Notion-Dark.svg" },
  "Notion API": { light: "Notion-Light.svg", dark: "Notion-Dark.svg" },
};

/**
 * Get skill-icons GitHub raw URL for a skill
 * @param skillName - The skill name
 * @param theme - 'light' or 'dark' (defaults to 'dark')
 */
export function getSkillIconUrl(
  skillName: string,
  theme: "light" | "dark" = "dark",
): string | null {
  const iconFiles = skillIconMap[skillName];
  if (!iconFiles) return null;

  const iconFile = theme === "dark" ? iconFiles.dark : iconFiles.light;

  // Use GitHub raw content URL for individual SVG files
  return `https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/${iconFile}`;
}
