"use server";

import { getInjection } from "@/di/container";
import {
  AiGenerationError,
  type AiGenerationFailure,
  InputParseError,
} from "@/src/entities/errors/common";
import type {
  AnalyzeResumeInput,
  ResumeAnalysis,
} from "@/src/entities/models/resume-analysis.model";

export type AnalyzeResumeState = {
  error?: string;
  result?: ResumeAnalysis;
} | null;

// What the analyzer says when the AI call fails.
const AI_FAILURES: Record<AiGenerationFailure, string> = {
  "unusable-answer": "The analysis came back incomplete. Try again.",
  "budget-paused": "The analyzer is paused: its AI budget is used up.",
  "service-unavailable": "The analyzer isn't answering. Try again in a minute.",
};

function optionalText(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length ? value : undefined;
}

async function readResumeFile(
  formData: FormData,
): Promise<AnalyzeResumeInput["resumeFile"]> {
  const file = formData.get("resumeFile");
  if (!(file instanceof File) || file.size === 0) return undefined;

  const data = new Uint8Array(await file.arrayBuffer());
  return { data, mediaType: file.type, filename: file.name };
}

export async function analyzeResume(
  _previousState: AnalyzeResumeState,
  formData: FormData,
): Promise<AnalyzeResumeState> {
  const logger = getInjection("ILoggerService").child({
    layer: "action",
    op: "analyzeResume",
  });

  try {
    const input: Partial<AnalyzeResumeInput> = {
      jobDescription: optionalText(formData, "jobDescription"),
      resumeText: optionalText(formData, "resumeText"),
      resumeFile: await readResumeFile(formData),
    };

    const controller = getInjection("IAnalyzeResumeController");
    const result = await controller(input);

    return { result };
  } catch (err) {
    if (err instanceof InputParseError) {
      logger.warn("Resume analysis input rejected", { error: err.message });
      return { error: err.message };
    }
    if (err instanceof AiGenerationError) {
      logger.warn("Resume analysis failed", { reason: err.reason });
      return { error: AI_FAILURES[err.reason] };
    }
    logger.error("Unexpected resume analysis failure", { error: String(err) });
    return { error: "Failed to analyze the resume. Please try again." };
  }
}
