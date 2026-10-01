import experienceData from "@/src/data/experience.json";
import profileData from "@/src/data/profile.json";
import projectsData from "@/src/data/projects.json";
import readingListData from "@/src/data/reading-list.json";
import skillsData from "@/src/data/skills.json";
import type {
  ExperienceData,
  Profile,
  Project,
  ProjectsData,
  ReadingListData,
  SkillsData,
} from "@/src/types/portfolio";

export function getProfile(): Profile {
  return profileData as Profile;
}

export function getSkills(): SkillsData {
  return skillsData as SkillsData;
}

export function getProjects(): ProjectsData {
  return projectsData as ProjectsData;
}

export function getExperience(): ExperienceData {
  return experienceData as ExperienceData;
}

export function getFeaturedProjects(): Project[] {
  return projectsData.projects.filter((project) => project.featured);
}

export function getProjectBySlug(slug: string): Project | null {
  const project = projectsData.projects.find((p) => p.slug === slug);
  return project || null;
}

export function getAllProjectSlugs(): string[] {
  return projectsData.projects.map((project) => project.slug);
}

export function getReadingList(): ReadingListData {
  return readingListData as ReadingListData;
}
