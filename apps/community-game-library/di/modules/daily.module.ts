import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { runDailyUseCase } from "@/src/application/use-cases/daily/run-daily.use-case";
import { runDailyController } from "@/src/interface-adapters/controllers/daily/run-daily.controller";

// The daily run (KTD8, U17).
export function createDailyModule() {
  const dailyModule = createModule();
  const {
    IGameNightsRepository: nights,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
  } = DI_SYMBOLS;

  dailyModule
    .bind(DI_SYMBOLS.IRunDailyUseCase)
    .toHigherOrderFunction(runDailyUseCase, [
      loans,
      userGames,
      notices,
      nights,
      transactions,
      log,
    ]);
  dailyModule
    .bind(DI_SYMBOLS.IRunDailyController)
    .toHigherOrderFunction(runDailyController, [
      DI_SYMBOLS.IRunDailyUseCase,
      log,
    ]);

  return dailyModule;
}
