import { describe, expect, it } from "bun:test";
import {
  getAllProjectSlugs,
  getExperience,
  getFeaturedProjects,
  getProfile,
  getProjectBySlug,
  getProjects,
  getSkills,
} from "@/src/lib/data";

describe("Data Functions", () => {
  describe("getProfile", () => {
    it("should return a profile object", () => {
      const profile = getProfile();
      expect(profile).toBeDefined();
      expect(profile).toHaveProperty("name");
      expect(profile).toHaveProperty("title");
      expect(profile).toHaveProperty("bio");
      expect(profile).toHaveProperty("email");
      expect(profile).toHaveProperty("social");
      expect(profile).toHaveProperty("consulting");
    });

    it("should have valid profile data", () => {
      const profile = getProfile();
      expect(typeof profile.name).toBe("string");
      expect(profile.name.length).toBeGreaterThan(0);
      expect(typeof profile.email).toBe("string");
      expect(profile.email).toContain("@");
    });
  });

  describe("getSkills", () => {
    it("should return skills data", () => {
      const skills = getSkills();
      expect(skills).toBeDefined();
      expect(skills).toHaveProperty("categories");
      expect(Array.isArray(skills.categories)).toBe(true);
    });

    it("should have at least one category", () => {
      const skills = getSkills();
      expect(skills.categories.length).toBeGreaterThan(0);
    });

    it("should have valid category structure", () => {
      const skills = getSkills();
      skills.categories.forEach((category) => {
        expect(category).toHaveProperty("name");
        expect(category).toHaveProperty("skills");
        expect(Array.isArray(category.skills)).toBe(true);
        expect(category.skills.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getExperience", () => {
    it("should return experience data", () => {
      const experience = getExperience();
      expect(experience).toBeDefined();
      expect(experience).toHaveProperty("experience");
      expect(Array.isArray(experience.experience)).toBe(true);
    });

    it("should have at least one experience", () => {
      const experience = getExperience();
      expect(experience.experience.length).toBeGreaterThan(0);
    });

    it("should have valid experience structure", () => {
      const experience = getExperience();
      experience.experience.forEach((exp) => {
        expect(exp).toHaveProperty("company");
        expect(exp).toHaveProperty("role");
        expect(exp).toHaveProperty("period");
        expect(exp).toHaveProperty("description");
        expect(exp).toHaveProperty("technologies");
        expect(Array.isArray(exp.technologies)).toBe(true);
        expect(typeof exp.company).toBe("string");
        expect(typeof exp.role).toBe("string");
        expect(typeof exp.period).toBe("string");
        expect(typeof exp.description).toBe("string");
      });
    });
  });

  describe("getProjects", () => {
    it("should return projects data", () => {
      const projects = getProjects();
      expect(projects).toBeDefined();
      expect(projects).toHaveProperty("projects");
      expect(Array.isArray(projects.projects)).toBe(true);
    });

    it("should have valid project structure", () => {
      const projects = getProjects();
      projects.projects.forEach((project) => {
        expect(project).toHaveProperty("id");
        expect(project).toHaveProperty("slug");
        expect(project).toHaveProperty("title");
        expect(project).toHaveProperty("description");
        expect(project).toHaveProperty("technologies");
        expect(Array.isArray(project.technologies)).toBe(true);
      });
    });
  });

  describe("getFeaturedProjects", () => {
    it("should return an array of featured projects", () => {
      const featuredProjects = getFeaturedProjects();
      expect(Array.isArray(featuredProjects)).toBe(true);
    });

    it("should only return featured projects", () => {
      const featuredProjects = getFeaturedProjects();
      featuredProjects.forEach((project) => {
        expect(project.featured).toBe(true);
      });
    });
  });

  describe("getProjectBySlug", () => {
    it("should return a project when slug exists", () => {
      const allProjects = getProjects();
      if (allProjects.projects.length > 0) {
        const firstProject = allProjects.projects[0];
        if (firstProject) {
          const project = getProjectBySlug(firstProject.slug);
          expect(project).toBeDefined();
          expect(project?.slug).toBe(firstProject.slug);
        }
      }
    });

    it("should return null when slug does not exist", () => {
      const project = getProjectBySlug("non-existent-slug-12345");
      expect(project).toBeNull();
    });
  });

  describe("getAllProjectSlugs", () => {
    it("should return an array of slugs", () => {
      const slugs = getAllProjectSlugs();
      expect(Array.isArray(slugs)).toBe(true);
    });

    it("should return all project slugs", () => {
      const projects = getProjects();
      const slugs = getAllProjectSlugs();
      expect(slugs.length).toBe(projects.projects.length);
    });

    it("should return valid slug strings", () => {
      const slugs = getAllProjectSlugs();
      slugs.forEach((slug) => {
        expect(typeof slug).toBe("string");
        expect(slug.length).toBeGreaterThan(0);
      });
    });
  });
});
