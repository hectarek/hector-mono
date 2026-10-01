import { describe, expect, it } from "bun:test";
import { cn } from "@repo/ui/lib/utils";

describe("Utils", () => {
  describe("cn (classNames utility)", () => {
    it("should merge class names", () => {
      const result = cn("class1", "class2");
      expect(typeof result).toBe("string");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });

    it("should handle conditional classes", () => {
      const condition = true;
      const result = cn("base", condition && "conditional");
      expect(result).toContain("base");
      expect(result).toContain("conditional");
    });

    it("should handle undefined and null", () => {
      const result = cn("base", undefined, null, "valid");
      expect(result).toContain("base");
      expect(result).toContain("valid");
    });
  });
});
