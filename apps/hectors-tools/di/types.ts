import type { IAiService } from "@/src/application/services/ai.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnalyzeResumeUseCase } from "@/src/application/use-cases/resume-analyzer/analyze-resume.use-case";
import type { IAnalyzeResumeController } from "@/src/interface-adapters/controllers/resume-analyzer/analyze-resume.controller";

export const DI_SYMBOLS = {
  ILoggerService: Symbol.for("ILoggerService"),
  IAiService: Symbol.for("IAiService"),
  IAnalyzeResumeUseCase: Symbol.for("IAnalyzeResumeUseCase"),
  IAnalyzeResumeController: Symbol.for("IAnalyzeResumeController"),
};

export interface DI_RETURN_TYPES {
  ILoggerService: ILoggerService;
  IAiService: IAiService;
  IAnalyzeResumeUseCase: IAnalyzeResumeUseCase;
  IAnalyzeResumeController: IAnalyzeResumeController;
}
