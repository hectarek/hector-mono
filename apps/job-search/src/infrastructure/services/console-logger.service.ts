import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  LOG_LEVEL_PRIORITY,
  type LogLevel,
} from "@/src/entities/models/logger.model";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: ANSI.dim,
  info: ANSI.cyan,
  warn: ANSI.yellow,
  error: ANSI.red,
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

function resolveMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel;
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") return "warn";
  if (nodeEnv === "test") return "error";
  return "debug";
}

function formatScope(context: Record<string, unknown>): string {
  const { layer, op, ...rest } = context;
  const scope = layer && op ? `[${layer}/${op}]` : "";
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${scope}${extra}`;
}

export class ConsoleLoggerService implements ILoggerService {
  private readonly minLevel: LogLevel;
  private readonly baseContext: Record<string, unknown>;

  constructor(baseContext: Record<string, unknown> = {}) {
    this.minLevel = resolveMinLevel();
    this.baseContext = baseContext;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  child(context: Record<string, unknown>): ILoggerService {
    return new ConsoleLoggerService({ ...this.baseContext, ...context });
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const color = LEVEL_COLOR[level];
    const label = LEVEL_LABEL[level];
    const merged = { ...this.baseContext, ...context };
    const scope = formatScope(merged);
    const prefix = `${color}[${label}]${ANSI.reset}`;
    const line = scope
      ? `${prefix} ${scope} ${message}`
      : `${prefix} ${message}`;

    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : console.debug;

    consoleFn(line);
  }
}
