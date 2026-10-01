import { describe, expect, it } from "bun:test";
import { firstParam, servingsParam } from "@/app/_lib/search-params";

describe("firstParam", () => {
  it("takes the first value, trimmed; blank counts as missing", () => {
    expect(firstParam(" pasta ")).toBe("pasta");
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("   ")).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("servingsParam", () => {
  it("a whole number of servings from 1 to 100, else nothing", () => {
    expect(servingsParam("6")).toBe(6);
    expect(servingsParam(["8", "2"])).toBe(8);
    for (const bad of ["0", "101", "2.5", "six", "-3", "", undefined]) {
      expect(servingsParam(bad)).toBeUndefined();
    }
  });
});
