import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { startSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { whoamiUseCase } from "@/src/application/use-cases/session/whoami.use-case";
import { startSessionController } from "@/src/interface-adapters/controllers/session/start-session.controller";
import { whoamiController } from "@/src/interface-adapters/controllers/session/whoami.controller";

// Claude's session tools, whoami and start_session (docs/build-plan.md U4).
export function createSessionModule() {
  const sessionModule = createModule();

  sessionModule.bind(DI_SYMBOLS.IWhoamiUseCase).toFunction(whoamiUseCase);
  sessionModule
    .bind(DI_SYMBOLS.IWhoamiController)
    .toHigherOrderFunction(whoamiController, [
      DI_SYMBOLS.IWhoamiUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  sessionModule
    .bind(DI_SYMBOLS.IStartSessionUseCase)
    .toHigherOrderFunction(startSessionUseCase, [
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  sessionModule
    .bind(DI_SYMBOLS.IStartSessionController)
    .toHigherOrderFunction(startSessionController, [
      DI_SYMBOLS.IStartSessionUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return sessionModule;
}
