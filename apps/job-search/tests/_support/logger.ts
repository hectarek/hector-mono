import type { ILoggerService } from "@/src/application/services/logger.service.interface";

type LogLine = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
};

// Keeps every line logged through it or its children, at every level, so a test can check what
// reached the logs, and what never did (docs/build-plan.md KTD20).
export class RecordingLogger implements ILoggerService {
  constructor(
    readonly lines: LogLine[] = [],
    private readonly scope: Record<string, unknown> = {},
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.record("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.record("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.record("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.record("error", message, context);
  }

  child(context: Record<string, unknown>): ILoggerService {
    return new RecordingLogger(this.lines, { ...this.scope, ...context });
  }

  // Everything logged, as one string to search.
  get text(): string {
    return JSON.stringify(this.lines);
  }

  private record(
    level: LogLine["level"],
    message: string,
    context: Record<string, unknown> = {},
  ): void {
    this.lines.push({ level, message, context: { ...this.scope, ...context } });
  }
}
