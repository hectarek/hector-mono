import type { IAiService } from "@/src/application/services/ai.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  type AnalyzeResumeInput,
  type ResumeAnalysis,
  resumeAnalysisSchema,
} from "@/src/entities/models/resume-analysis.model";

const SYSTEM_PROMPT = `You are an expert technical recruiter and resume coach.
Compare a candidate's resume against a target job description and produce an honest, specific assessment.

Scoring guidance:
- matchScore (0-100) reflects how well the resume's evidence covers the job's requirements. Be realistic: a strong but imperfect fit is ~70-85, a clear mismatch is below 40.
- matchedSkills / missingSkills are drawn from the job description's stated requirements, judged against what the resume actually demonstrates (not just mentions).
- atsKeywords compares important keywords/phrases from the job description against their literal presence in the resume (this is the ATS keyword view, distinct from demonstrated skill).
- suggestions are concrete, actionable edits tailored to THIS job, ordered by impact (high → low). Avoid generic advice.

Be concise and never invent experience the resume does not contain.`;

export type IAnalyzeResumeUseCase = ReturnType<typeof analyzeResumeUseCase>;

export const analyzeResumeUseCase = (
  aiService: IAiService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "analyzeResume",
  });

  return async (input: AnalyzeResumeInput): Promise<ResumeAnalysis> => {
    const hasFile = !!input.resumeFile;
    logger.info("Analyzing resume against job description", {
      source: hasFile ? "file" : "text",
      jobDescriptionLength: input.jobDescription.length,
    });

    const resumeSection = hasFile
      ? "The candidate's resume is provided as the attached file."
      : `RESUME:\n${input.resumeText}`;

    const prompt = `Analyze the following resume against the job description.

JOB DESCRIPTION:
${input.jobDescription}

${resumeSection}`;

    const analysis = await aiService.generateObject({
      schema: resumeAnalysisSchema,
      system: SYSTEM_PROMPT,
      prompt,
      files: input.resumeFile
        ? [
            {
              data: input.resumeFile.data,
              mediaType: input.resumeFile.mediaType,
            },
          ]
        : undefined,
    });

    logger.debug("Analysis complete", { matchScore: analysis.matchScore });
    return analysis;
  };
};
