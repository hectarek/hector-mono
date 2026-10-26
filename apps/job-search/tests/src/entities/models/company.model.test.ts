import { describe, expect, it } from "bun:test";
import {
  companyNameKey,
  saveCompanySchema,
} from "@/src/entities/models/company.model";

const ID = "00000000-0000-4000-8000-0000000000c1";
const READ = "2026-10-26T15:00:00.123Z";

describe("companyNameKey", () => {
  it("compares names ignoring case and punctuation", () => {
    for (const name of ["Acme, Inc.", "ACME Inc", "acme inc", "Acme-Inc!"]) {
      expect(companyNameKey(name)).toBe("acmeinc");
    }
    expect(companyNameKey("Acme Labs")).not.toBe(companyNameKey("Acme Inc"));
  });

  it("keeps letters and digits in any script", () => {
    expect(companyNameKey("Café 21, S.A.")).toBe("café21sa");
  });
});

describe("saveCompanySchema", () => {
  it("reads input without an id as a new company, every fact not given empty", () => {
    expect(
      saveCompanySchema.parse({
        name: "  Acme Inc ",
        location: " ",
        tier: 2,
      }),
    ).toEqual({
      kind: "new",
      facts: {
        name: "Acme Inc",
        website: null,
        location: null,
        headcount: null,
        industry: null,
        officePolicy: null,
        leavePolicy: null,
        tier: 2,
        researchSummary: null,
        researchRef: null,
      },
    });
  });

  it("reads input with an id as a change to the facts given, null clearing one, against the time read", () => {
    expect(
      saveCompanySchema.parse({
        id: ID,
        updatedAt: READ,
        industry: null,
        headcount: 12,
      }),
    ).toEqual({
      kind: "change",
      id: ID,
      updatedAt: new Date(READ),
      changes: { industry: null, headcount: 12 },
    });
  });

  it.each([
    { label: "a new company without a name", input: {} },
    { label: "a change without the updatedAt read", input: { id: ID } },
    {
      label: "a link that isn't http or https",
      input: { name: "Acme Inc", website: "javascript:alert(1)" },
    },
    { label: "a tier outside 1 to 3", input: { name: "Acme Inc", tier: 4 } },
    {
      label: "a headcount that isn't a whole number",
      input: { name: "Acme Inc", headcount: 2.5 },
    },
    {
      label: "a name longer than 120 characters",
      input: { name: "x".repeat(121) },
    },
  ])("refuses $label", ({ input }) => {
    expect(saveCompanySchema.safeParse(input).success).toBe(false);
  });
});
