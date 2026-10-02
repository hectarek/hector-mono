import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import { NotFoundError } from "@/src/entities/errors/common";

export type IRevokeInviteUseCase = ReturnType<typeof revokeInviteUseCase>;

export const revokeInviteUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "revokeInvite" });

  return async (inviteId: string, userId: string): Promise<string> => {
    const spaceId = await transactionManagerService.startTransaction(
      async (tx) => {
        const invite = await spacesRepository.getInviteById(inviteId, tx);
        if (!invite) {
          throw new NotFoundError("Invite not found");
        }
        await requireOwner(spacesRepository, invite.spaceId, userId, tx);
        await spacesRepository.revokeInvite(inviteId, tx);
        return invite.spaceId;
      },
    );
    logger.info("Invite revoked", { spaceId });
    return spaceId;
  };
};
