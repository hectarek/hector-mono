import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { GameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository";
import { MockGameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository.mock";

// Game nights (R29 to R39): U17's daily run reads who's going; Batch 5 adds the nights.
export function createNightsModule() {
  const nightsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(MockGameNightsRepository);
  } else {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(GameNightsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return nightsModule;
}
