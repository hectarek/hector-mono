import { z } from "zod";
import {
  httpLink,
  optionalText,
  requiredText,
  timeSchema,
} from "./input.model";
import type { JobSummary } from "./job.model";

// A company (R4): the employer of record for its jobs, so for a role through an agency, the
// agency. It holds the facts R4 lists, a short research summary, and where the long-form research
// is kept in Hector's private docs (docs/build-plan.md U5).
export type Company = {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  // About how many people work there: the fit checklist's company size (R17).
  headcount: number | null;
  industry: string | null;
  officePolicy: string | null;
  leavePolicy: string | null;
  // 1 is the most wanted.
  tier: number | null;
  researchSummary: string | null;
  // Where the long-form research is kept: a path or a note's name in Hector's private docs.
  researchRef: string | null;
  // When it last changed: a change sends back the one it read (R22).
  updatedAt: Date;
};

// What a company holds, and what a change can set: all but its id and when it last changed.
export type CompanyFacts = Omit<Company, "id" | "updatedAt">;

// A company's facts, as its history records them.
export function companyFacts({
  id,
  updatedAt,
  ...facts
}: Company): CompanyFacts {
  return facts;
}

// Another company, by name: one whose name matches ignoring case and punctuation.
export type CompanyRef = Pick<Company, "id" | "name">;

const companyFactsSchema = z.object({
  name: requiredText(120, "A company needs a name"),
  website: httpLink(300).nullable(),
  location: optionalText(120),
  headcount: z
    .int({ error: "Use a whole number of people" })
    .min(1, { error: "At least 1" })
    .max(10_000_000, { error: "At most 10,000,000" })
    .nullable(),
  industry: optionalText(80),
  officePolicy: optionalText(200),
  leavePolicy: optionalText(200),
  tier: z
    .int({ error: "Use 1, 2 or 3" })
    .min(1, { error: "Use 1, 2 or 3" })
    .max(3, { error: "Use 1, 2 or 3" })
    .nullable(),
  researchSummary: optionalText(2000),
  researchRef: optionalText(300),
});

// What save_company asks for, once read: a new company with its facts (a fact not given is
// empty), or a change to the given facts of one, against the updatedAt read with it.
export type SaveCompanyRequest =
  | { kind: "new"; facts: CompanyFacts }
  | {
      kind: "change";
      id: string;
      updatedAt: Date;
      changes: Partial<CompanyFacts>;
    };

// save_company's input: without an id, a new company, which needs a name; with one, a change to
// that company, which sends back the updatedAt it read (R22). A change sets only the facts it
// gives, and null clears one.
export const saveCompanySchema = z
  .object({ id: z.uuid().optional(), updatedAt: timeSchema.optional() })
  .extend(companyFactsSchema.partial().shape)
  .superRefine(({ id, updatedAt, name }, ctx) => {
    if (id === undefined && name === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "A company needs a name",
      });
    }
    if (id !== undefined && updatedAt === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["updatedAt"],
        message:
          "Send the updatedAt read with the company, so a change made since isn't overwritten",
      });
    }
  })
  .transform(({ id, updatedAt, ...given }): SaveCompanyRequest => {
    if (id !== undefined && updatedAt !== undefined) {
      return { kind: "change", id, updatedAt, changes: given };
    }
    return {
      kind: "new",
      facts: {
        name: given.name ?? "",
        website: given.website ?? null,
        location: given.location ?? null,
        headcount: given.headcount ?? null,
        industry: given.industry ?? null,
        officePolicy: given.officePolicy ?? null,
        leavePolicy: given.leavePolicy ?? null,
        tier: given.tier ?? null,
        researchSummary: given.researchSummary ?? null,
        researchRef: given.researchRef ?? null,
      },
    };
  });

// What saving answers: the company as saved, whether this made it, and any company whose name
// matches its own ignoring case and punctuation (the soft duplicate warning, U5).
export type SavedCompany = {
  company: Company;
  created: boolean;
  similar: CompanyRef[];
};

// get_company's input, and deleting's: which company.
export const companyIdSchema = z.object({ id: z.uuid() });

// A company as its page and get_company show it, with the same warning and its accepted jobs.
export type CompanyDetail = {
  company: Company;
  similar: CompanyRef[];
  jobs: JobSummary[];
};

// The most companies a page of find_companies holds.
export const COMPANY_PAGE_MAX = 50;

// find_companies' input: the owner's companies whose names hold the query, compared ignoring case
// and punctuation (every company without one), by name, a page at a time.
export const findCompaniesSchema = z.object({
  query: z
    .string()
    .trim()
    .max(120, { error: "At most 120 characters" })
    .optional(),
  limit: z.int().min(1).max(COMPANY_PAGE_MAX).default(20),
  offset: z.int().min(0).default(0),
});
export type CompanyQuery = z.output<typeof findCompaniesSchema>;

// A company as a list shows it.
export type CompanySummary = Pick<
  Company,
  "id" | "name" | "industry" | "location" | "tier"
>;

// nextOffset: where the next page starts, or null on the last one.
export type CompanyPage = {
  companies: CompanySummary[];
  nextOffset: number | null;
};

// A name as companies compare (the duplicate warning, find_companies): case and punctuation
// ignored, so "Acme, Inc.", "ACME Inc" and "acme inc" are one name. Only letters and digits stay.
export function companyNameKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
