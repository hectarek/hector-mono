import { describe, expect, it } from "bun:test";
import { backTo, withFrom } from "@/app/_lib/back-link";

const JOBS = { href: "/jobs", label: "Jobs" };

describe("a record's back link (the UX plan's UX8)", () => {
  it("returns to the page it was opened from, named for it", () => {
    expect(backTo("/", JOBS)).toEqual({ href: "/", label: "This week" });
    expect(backTo("/people?view=no-date", JOBS)).toEqual({
      href: "/people?view=no-date",
      label: "People",
    });
    expect(backTo("/companies/0f2c", JOBS)).toEqual({
      href: "/companies/0f2c",
      label: "Company",
    });
    expect(backTo("/week?week=2026-11-02", JOBS)).toEqual({
      href: "/week?week=2026-11-02",
      label: "Weekly review",
    });
  });

  it("falls back to the section's list with no from, or one that would leave the app", () => {
    expect(backTo(undefined, JOBS)).toEqual(JOBS);
    expect(backTo("//evil.example", JOBS)).toEqual(JOBS);
    expect(backTo("https://evil.example/jobs", JOBS)).toEqual(JOBS);
    expect(backTo("/settings", JOBS)).toEqual(JOBS);
  });

  it("carries where a link was followed from", () => {
    expect(withFrom("/jobs/1", "/people?view=next")).toBe(
      "/jobs/1?from=%2Fpeople%3Fview%3Dnext",
    );
    expect(withFrom("/jobs/1", undefined)).toBe("/jobs/1");
  });
});
