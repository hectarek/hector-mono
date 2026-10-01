import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnalyzeResumeUseCase } from "@/src/application/use-cases/resume-analyzer/analyze-resume.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import {
  type AnalyzeResumeInput,
  analyzeResumeInputSchema,
  type ResumeAnalysis,
} from "@/src/entities/models/resume-analysis.model";

/** Resume uploads must be PDFs (the only file type a multimodal model reads reliably). */
const ACCEPTED_MEDIA_TYPE = "application/pdf";
/** 8 MB upload ceiling. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type IAnalyzeResumeController = ReturnType<
  typeof analyzeResumeController
>;

export const analyzeResumeController = (
  analyzeResumeUseCase: IAnalyzeResumeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "analyzeResume",
  });

  // No auth gate: hectors-tools is a lean, public-access app with no user identity.
  return async (
    input: Partial<AnalyzeResumeInput>,
  ): Promise<ResumeAnalysis> => {
    const { data, error: parseError } =
      analyzeResumeInputSchema.safeParse(input);

    if (parseError) {
      logger.warn("Input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    const hasText = !!data.resumeText?.trim();
    const hasFile = !!data.resumeFile;

    if (hasText === hasFile) {
      throw new InputParseError(
        "Provide a resume as either pasted text or an uploaded file, not both or neither.",
      );
    }

    if (data.resumeFile) {
      if (data.resumeFile.mediaType !== ACCEPTED_MEDIA_TYPE) {
        throw new InputParseError("Resume uploads must be PDF files.");
      }
      if (data.resumeFile.data.byteLength > MAX_FILE_BYTES) {
        throw new InputParseError("Resume file is too large (8 MB max).");
      }
    }

    return analyzeResumeUseCase(data);
  };
};
