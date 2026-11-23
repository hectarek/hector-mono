import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  DailyRun,
  IRunDailyUseCase,
} from "@/src/application/use-cases/daily/run-daily.use-case";

export type IRunDailyController = ReturnType<typeof runDailyController>;

// The daily run (KTD8), now. Its route has checked the schedule's secret: there's no member.
export const runDailyController = (
  useCase: IRunDailyUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "runDaily" });

  return async (): Promise<DailyRun> => {
    logger.debug("Running");
    return useCase(new Date());
  };
};
