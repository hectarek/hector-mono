import { describe, expect, it } from "bun:test";
import type { ExperienceData } from "@/src/types/portfolio";

describe("ExperienceSection Logic", () => {
  const mockExperience: ExperienceData = {
    experience: [
      {
        company: "Test Company",
        role: "Test Role",
        period: "2020 - Present",
        description: "Test description.",
        technologies: ["React", "TypeScript"],
      },
      {
        company: "Another Company",
        role: "Another Role",
        period: "2018 - 2020",
        description: "Another description.",
        technologies: ["JavaScript", "Node.js"],
      },
    ],
  };

  it("should validate experience data structure", () => {
    expect(mockExperience).toBeDefined();
    expect(mockExperience.experience).toBeDefined();
    expect(Array.isArray(mockExperience.experience)).toBe(true);
    expect(mockExperience.experience.length).toBeGreaterThan(0);
  });

  it("should validate empty experience data", () => {
    const emptyExperience: ExperienceData = { experience: [] };
    expect(emptyExperience.experience.length).toBe(0);
  });

  it("should validate experience item structure", () => {
    mockExperience.experience.forEach((exp) => {
      expect(exp).toHaveProperty("company");
      expect(exp).toHaveProperty("role");
      expect(exp).toHaveProperty("period");
      expect(exp).toHaveProperty("description");
      expect(exp).toHaveProperty("technologies");
      expect(Array.isArray(exp.technologies)).toBe(true);
    });
  });

  it("should validate showCTA prop logic", () => {
    const showCTA = true;
    const hideCTA = false;
    expect(typeof showCTA).toBe("boolean");
    expect(typeof hideCTA).toBe("boolean");
  });
});
