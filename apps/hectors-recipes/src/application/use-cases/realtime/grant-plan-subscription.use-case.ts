import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { planChannel, type RealtimeGrant } from "@/src/entities/realtime";

export type IGrantPlanSubscriptionUseCase = ReturnType<
  typeof grantPlanSubscriptionUseCase
>;

// A browser's pass to hear when a plan's grocery list changes (ux-plan D21): anyone in the
// plan, view-only included, and only for that plan's channel.
export const grantPlanSubscriptionUseCase = (
  spacesRepository: ISpacesRepository,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "grantPlanSubscription",
  });

  return async (planId: string, userId: string): Promise<RealtimeGrant> => {
    await requireSpaceRole(spacesRepository, {
      spaceId: planId,
      userId,
      type: "meal-plan",
      minRole: "viewer",
    });
    const grant = await realtimeService.createSubscribeGrant(
      planChannel(planId),
      userId,
    );
    logger.debug("Subscription granted", { planId });
    return grant;
  };
};
