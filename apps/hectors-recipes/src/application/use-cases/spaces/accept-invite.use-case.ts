import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { isUntouchedPlan } from "@/src/application/use-cases/spaces/untouched-plan";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Space } from "@/src/entities/models/space.model";

export type IAcceptInviteUseCase = ReturnType<typeof acceptInviteUseCase>;

export const acceptInviteUseCase = (
  spacesRepository: ISpacesRepository,
  planEntriesRepository: IPlanEntriesRepository,
  groceryItemsRepository: IGroceryItemsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "acceptInvite" });

  return async (
    token: string,
    userId: string,
    // For a plan, when their own plan is in use: make the joined one their default.
    { makeDefault = false }: { makeDefault?: boolean } = {},
  ): Promise<Space> =>
    transactionManagerService.startTransaction(async (tx) => {
      const invite = await spacesRepository.getActiveInviteByToken(token, tx);
      const space =
        invite && (await spacesRepository.getById(invite.spaceId, tx));
      if (!invite || !space) {
        throw new NotFoundError("This invite link is no longer active");
      }

      // Existing members keep their role; an invite never downgrades or upgrades anyone.
      const wasMember = !!(
        await spacesRepository.getAccess(space.id, userId, tx)
      )?.role;
      await spacesRepository.addMember(space.id, userId, invite.role, tx);
      logger.info("Invite accepted", {
        spaceId: space.id,
        role: invite.role,
        userId,
      });

      // Joining someone's plan (D15): an untouched plan of their own goes, and the joined
      // plan becomes the one they open to. One in use stays, and they chose on the join
      // screen whether to switch.
      if (space.type === "meal-plan" && !wasMember) {
        const own = await spacesRepository.findOwned(userId, "meal-plan", tx);
        const replace =
          !!own &&
          (await isUntouchedPlan(
            {
              spaces: spacesRepository,
              planEntries: planEntriesRepository,
              groceryItems: groceryItemsRepository,
            },
            own.id,
            tx,
          ));
        if (own && replace) {
          await spacesRepository.delete(own.id, tx);
          logger.info("Untouched plan replaced", { planId: own.id, userId });
        }
        if (!own || replace || makeDefault) {
          await spacesRepository.setDefault(userId, "meal-plan", space.id, tx);
        }
      }
      return space;
    });
};
