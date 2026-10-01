import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { isUntouchedPlan } from "@/src/application/use-cases/spaces/untouched-plan";
import { NotFoundError } from "@/src/entities/errors/common";
import type { InvitePreview } from "@/src/entities/models/space.model";

export type IPreviewInviteUseCase = ReturnType<typeof previewInviteUseCase>;

// Read-only: what the link grants, shown before the person chooses to join. Signed out
// (the welcome screen), there's no one to look up, so it's never "already a member".
export const previewInviteUseCase = (
  spacesRepository: ISpacesRepository,
  planEntriesRepository: IPlanEntriesRepository,
  groceryItemsRepository: IGroceryItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "previewInvite",
  });

  return async (
    token: string,
    userId: string | undefined,
  ): Promise<InvitePreview> => {
    const invite = await spacesRepository.getActiveInviteByToken(token);
    const space = invite && (await spacesRepository.getById(invite.spaceId));
    if (!invite || !space) {
      throw new NotFoundError("This invite link is no longer active");
    }

    const role = userId
      ? await spacesRepository.getMemberRole(space.id, userId)
      : null;
    // Joining a plan while their own is in use: the join screen asks about the default.
    const own =
      userId && !role && space.type === "meal-plan"
        ? await spacesRepository.findOwned(userId, "meal-plan")
        : undefined;
    const ownPlanInUse =
      !!own &&
      !(await isUntouchedPlan(
        {
          spaces: spacesRepository,
          planEntries: planEntriesRepository,
          groceryItems: groceryItemsRepository,
        },
        own.id,
      ));
    logger.debug("Invite previewed", {
      spaceId: space.id,
      alreadyMember: !!role,
    });
    return {
      spaceId: space.id,
      spaceName: space.name,
      spaceType: space.type,
      role: invite.role,
      alreadyMember: !!role,
      ownPlanInUse,
    };
  };
};
