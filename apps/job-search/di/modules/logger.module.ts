import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { ConsoleLoggerService } from "@/src/infrastructure/services/console-logger.service";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";

export function createLoggerModule() {
  const loggerModule = createModule();

  if (process.env.NODE_ENV === "test") {
    loggerModule.bind(DI_SYMBOLS.ILoggerService).toClass(MockLoggerService);
  } else {
    loggerModule.bind(DI_SYMBOLS.ILoggerService).toClass(ConsoleLoggerService);
  }

  return loggerModule;
}
