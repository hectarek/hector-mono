import type { ILoggerService } from "@/src/application/services/logger.service.interface";

export class MockLoggerService implements ILoggerService {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}

  child(): ILoggerService {
    return this;
  }
}
