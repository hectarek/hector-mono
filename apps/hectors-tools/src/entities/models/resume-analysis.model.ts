import { z } from "zod";

/**
 * Domain model for the Resume Analyzer tool.
 *
 * `resumeAnalysisSchema` is the single source of truth for the structured AI
 * output, the controller's return type, and the UI props.
 * `analyzeResumeInputSchema` validates what the controller receives.
 */

const SUGGESTION_PRIORITIES = ["high", "medium", "low"] as const;

export const resumeAnalysisSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Overall match between the resume and the job description, 0-100.",
    ),
  summary: z
    .string()
    .describe("One-sentence verdict summarizing the overall fit."),
  matchedSkills: z
    .array(z.string())
    .describe(
      "Skills and requirements from the job description that the resume clearly demonstrates.",
    ),
  missingSkills: z
    .array(z.string())
    .describe(
      "Skills and requirements from the job description that the resume does not demonstrate.",
    ),
  atsKeywords: z
    .object({
      present: z
        .array(z.string())
        .describe("Important job-description keywords found in the resume."),
      missing: z
        .array(z.string())
        .describe("Important job-description keywords absent from the resume."),
    })
    .describe("ATS-style keyword coverage."),
  suggestions: z
    .array(
      z.object({
        priority: z.enum(SUGGESTION_PRIORITIES),
        suggestion: z
          .string()
          .describe("A concrete, actionable edit to improve the resume."),
      }),
    )
    .describe("Prioritized edits to close the gap for this specific job."),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type SuggestionPriority = (typeof SUGGESTION_PRIORITIES)[number];

/** A resume supplied as an uploaded file (e.g. a PDF) rather than pasted text. */
const resumeFileSchema = z.object({
  data: z.instanceof(Uint8Array),
  mediaType: z.string().min(1),
  filename: z.string().optional(),
});

export const analyzeResumeInputSchema = z.object({
  jobDescription: z
    .string()
    .min(1, { error: "A job description is required." }),
  resumeText: z.string().optional(),
  resumeFile: resumeFileSchema.optional(),
});

export type AnalyzeResumeInput = z.infer<typeof analyzeResumeInputSchema>;
