export interface Profile {
  name: string;
  title: string;
  tagline?: string;
  bio: string;
  image?: string;
  email: string;
  location?: string;
  social: {
    github: string;
    linkedin: string;
    twitter?: string;
  };
  consulting: {
    available: boolean;
    note: string;
  };
  currentlyBuilding?: string[];
}

export interface SkillCategory {
  name: string;
  description?: string;
  skills: string[];
}

export interface SkillsData {
  categories: SkillCategory[];
}

export interface ProjectMetric {
  label: string;
  value: string;
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  technologies: string[];
  image?: string;
  url: string | null;
  github: string | null;
  featured: boolean;
  date: string;
  status?: string;
  role?: string;
  metrics?: ProjectMetric[];
  highlights?: string[];
  problem?: string;
  solution?: string;
  impact?: string;
  features?: string[];
  links?: ProjectLink[];
}

export interface ProjectsData {
  projects: Project[];
}

export interface ExperienceMetric {
  label: string;
  value: string;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string;
  technologies: string[];
  bullets?: string[];
  metrics?: ExperienceMetric[];
  location?: string;
}

export interface ExperienceData {
  experience: Experience[];
}

export interface ReadingResource {
  name: string;
  url: string;
  description: string;
  cadence?: string;
}

export interface ReadingCategory {
  id: string;
  name: string;
  description?: string;
  resources: ReadingResource[];
}

export interface ReadingListData {
  intro: string;
  lastUpdated: string;
  categories: ReadingCategory[];
}
