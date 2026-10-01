import { createContainer } from "@evyweb/ioctopus";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createResumeAnalyzerModule } from "@/di/modules/resume-analyzer.module";
import { type DI_RETURN_TYPES, DI_SYMBOLS } from "@/di/types";

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(
  Symbol("ResumeAnalyzerModule"),
  createResumeAnalyzerModule(),
);

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
