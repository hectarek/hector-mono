import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { grantPlanSubscriptionUseCase } from "@/src/application/use-cases/realtime/grant-plan-subscription.use-case";
import { AblyRealtimeService } from "@/src/infrastructure/services/ably-realtime.service";
import { MockRealtimeService } from "@/src/infrastructure/services/mock-realtime.service";
import { grantPlanSubscriptionController } from "@/src/interface-adapters/controllers/realtime/grant-plan-subscription.controller";

export function createRealtimeModule() {
  const realtimeModule = createModule();

  if (process.env.NODE_ENV === "test") {
    realtimeModule
      .bind(DI_SYMBOLS.IRealtimeService)
      .toClass(MockRealtimeService);
  } else {
    realtimeModule
      .bind(DI_SYMBOLS.IRealtimeService)
      .toClass(AblyRealtimeService, [DI_SYMBOLS.ILoggerService]);
  }

  realtimeModule
    .bind(DI_SYMBOLS.IGrantPlanSubscriptionUseCase)
    .toHigherOrderFunction(grantPlanSubscriptionUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.IRealtimeService,
      DI_SYMBOLS.ILoggerService,
    ]);
  realtimeModule
    .bind(DI_SYMBOLS.IGrantPlanSubscriptionController)
    .toHigherOrderFunction(grantPlanSubscriptionController, [
      DI_SYMBOLS.IGrantPlanSubscriptionUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return realtimeModule;
}
