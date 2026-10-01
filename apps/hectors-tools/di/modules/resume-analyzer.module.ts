import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { analyzeResumeUseCase } from "@/src/application/use-cases/resume-analyzer/analyze-resume.use-case";
import { AiService } from "@/src/infrastructure/services/ai.service";
import { MockAiService } from "@/src/infrastructure/services/mock-ai.service";
import { analyzeResumeController } from "@/src/interface-adapters/controllers/resume-analyzer/analyze-resume.controller";

export function createResumeAnalyzerModule() {
  const resumeAnalyzerModule = createModule();

  if (process.env.NODE_ENV === "test") {
    resumeAnalyzerModule.bind(DI_SYMBOLS.IAiService).toClass(MockAiService);
  } else {
    resumeAnalyzerModule
      .bind(DI_SYMBOLS.IAiService)
      .toClass(AiService, [DI_SYMBOLS.ILoggerService]);
  }

  resumeAnalyzerModule
    .bind(DI_SYMBOLS.IAnalyzeResumeUseCase)
    .toHigherOrderFunction(analyzeResumeUseCase, [
      DI_SYMBOLS.IAiService,
      DI_SYMBOLS.ILoggerService,
    ]);

  resumeAnalyzerModule
    .bind(DI_SYMBOLS.IAnalyzeResumeController)
    .toHigherOrderFunction(analyzeResumeController, [
      DI_SYMBOLS.IAnalyzeResumeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return resumeAnalyzerModule;
}
