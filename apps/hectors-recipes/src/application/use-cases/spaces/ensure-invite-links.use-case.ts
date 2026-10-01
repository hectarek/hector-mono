import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import type {
  InviteRole,
  SpaceInvite,
} from "@/src/entities/models/space.model";

export type IEnsureInviteLinksUseCase = ReturnType<
  typeof ensureInviteLinksUseCase
>;

// A live link for each role, for the Invite sheet (ux-plan D20): the newest one already
// live, or a new one. Made when the sheet opens, so the tap that shares needn't wait (iOS
// only opens the share sheet straight from a tap).
export const ensureInviteLinksUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "ensureInviteLinks",
  });

  return async (
    spaceId: string,
    userId: string,
  ): Promise<Record<InviteRole, SpaceInvite>> => {
    const links = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireOwner(spacesRepository, spaceId, userId, tx);
        // Newest first, so find() takes the latest link of each role.
        const live = await spacesRepository.listActiveInvites(spaceId, tx);
        const linkFor = async (role: InviteRole) =>
          live.find((invite) => invite.role === role) ??
          (await spacesRepository.createInvite(spaceId, role, userId, tx));

        return {
          editor: await linkFor("editor"),
          viewer: await linkFor("viewer"),
        };
      },
    );
    logger.debug("Invite links ready", { spaceId });
    return links;
  };
};
